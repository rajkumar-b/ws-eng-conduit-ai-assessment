import { Injectable } from '@nestjs/common';
import { EntityManager, QueryOrder, wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';

import { User } from '../user/user.entity';
import { Tag } from '../tag/tag.entity';
import { Article } from './article.entity';
import { IArticleRO, IArticlesRO, ICommentsRO } from './article.interface';
import { Comment } from './comment.entity';
import { ArticleLock } from './lock.entity';
import { CreateArticleDto, CreateCommentDto } from './dto';

@Injectable()
export class ArticleService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Article)
    private readonly articleRepository: EntityRepository<Article>,
    @InjectRepository(Comment)
    private readonly commentRepository: EntityRepository<Comment>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    @InjectRepository(Tag)
    private readonly tagRepository: EntityRepository<Tag>,
    @InjectRepository(ArticleLock)
    private readonly lockRepository: EntityRepository<ArticleLock>,
  ) {}

  async findAll(userId: number, query: Record<string, string>): Promise<IArticlesRO> {
    const user = userId
      ? await this.userRepository.findOne(userId, { populate: ['followers', 'favorites'] })
      : undefined;
    const qb = this.articleRepository.createQueryBuilder('a').select('a.*').leftJoin('a.author', 'u').leftJoinAndSelect('a.coAuthors', 'coAuthors'); 

    if ('tag' in query) {
      qb.andWhere({ tagList: new RegExp(query.tag) });
    }

    if ('author' in query) {
      const author = await this.userRepository.findOne({ username: query.author });

      if (!author) {
        return { articles: [], articlesCount: 0 };
      }

      qb.andWhere({ author: author.id });
    }

    if ('favorited' in query) {
      const author = await this.userRepository.findOne({ username: query.favorited }, { populate: ['favorites'] });

      if (!author) {
        return { articles: [], articlesCount: 0 };
      }

      const ids = author.favorites.$.getIdentifiers();
      qb.andWhere({ author: ids });
    }

    qb.orderBy({ createdAt: QueryOrder.DESC });
    const res = await qb.clone().count('id', true).execute('get');
    const articlesCount = res.count;

    if ('limit' in query) {
      qb.limit(+query.limit);
    }

    if ('offset' in query) {
      qb.offset(+query.offset);
    }

    const articles = await qb.getResult();

    return { articles: articles.map((a) => a.toJSON(user!)), articlesCount };
  }

  async findFeed(userId: number, query: Record<string, string>): Promise<IArticlesRO> {
    const user = userId
      ? await this.userRepository.findOne(userId, { populate: ['followers', 'favorites'] })
      : undefined;
    const res = await this.articleRepository.findAndCount(
      { author: { followers: userId } },
      {
        populate: ['author', 'coAuthors'],
        orderBy: { createdAt: QueryOrder.DESC },
        limit: +query.limit,
        offset: +query.offset,
      },
    );

    console.log('findFeed', { articles: res[0], articlesCount: res[1] });
    return { articles: res[0].map((a) => a.toJSON(user!)), articlesCount: res[1] };
  }

  async findOne(userId: number, where: Partial<Article>): Promise<IArticleRO> {
    const user = userId
      ? await this.userRepository.findOneOrFail(userId, { populate: ['followers', 'favorites'] })
      : undefined;
    const article = await this.articleRepository.findOne(where, { populate: ['author', 'coAuthors'] });
    return { article: article && article.toJSON(user) } as IArticleRO;
  }

  async addComment(userId: number, slug: string, dto: CreateCommentDto) {
    const article = await this.articleRepository.findOneOrFail({ slug }, { populate: ['author'] });
    const author = await this.userRepository.findOneOrFail(userId);
    const comment = new Comment(author, article, dto.body);
    await this.em.persistAndFlush(comment);

    return { comment, article: article.toJSON(author) };
  }

  async deleteComment(userId: number, slug: string, id: number): Promise<IArticleRO> {
    const article = await this.articleRepository.findOneOrFail({ slug }, { populate: ['author'] });
    const user = await this.userRepository.findOneOrFail(userId);
    const comment = this.commentRepository.getReference(id);

    if (article.comments.contains(comment)) {
      article.comments.remove(comment);
      await this.em.removeAndFlush(comment);
    }

    return { article: article.toJSON(user) };
  }

  async favorite(id: number, slug: string): Promise<IArticleRO> {
    const article = await this.articleRepository.findOneOrFail({ slug }, { populate: ['author'] });
    const user = await this.userRepository.findOneOrFail(id, { populate: ['favorites', 'followers'] });

    if (!user.favorites.contains(article)) {
      user.favorites.add(article);
      article.favoritesCount++;
    }

    await this.em.flush();
    return { article: article.toJSON(user) };
  }

  async unFavorite(id: number, slug: string): Promise<IArticleRO> {
    const article = await this.articleRepository.findOneOrFail({ slug }, { populate: ['author'] });
    const user = await this.userRepository.findOneOrFail(id, { populate: ['followers', 'favorites'] });

    if (user.favorites.contains(article)) {
      user.favorites.remove(article);
      article.favoritesCount--;
    }

    await this.em.flush();
    return { article: article.toJSON(user) };
  }

  async findComments(slug: string): Promise<ICommentsRO> {
    const article = await this.articleRepository.findOne({ slug }, { populate: ['comments'] });
    return { comments: article!.comments.getItems() };
  }

  async create(userId: number, dto: CreateArticleDto) {
    const user = await this.userRepository.findOne(
      { id: userId },
      { populate: ['followers', 'favorites', 'articles'] },
    );
    const article = new Article(user!, dto.title, dto.description, dto.body);

    // Convert comma-separated string to array of strings
    const tags = dto.tagList.split(',').map(tag => tag.trim());

    const tagEntities: Tag[] = [];

    for (const tagName of tags) {
      let tagEntity = await this.tagRepository.findOne({ tag: tagName });

      if (!tagEntity) {
        tagEntity = new Tag();
        tagEntity.tag = tagName;
        await this.em.persist(tagEntity);
      }

      tagEntities.push(tagEntity);
    }

    article.tagList.push(...tags);

    user?.articles.add(article);
    await this.em.flush();

    return { article: article.toJSON(user!) };
  }

  async update(userId: number, slug: string, articleData: any): Promise<IArticleRO> {
    const user = await this.userRepository.findOne(
      { id: userId },
      { populate: ['followers', 'favorites', 'articles'] },
    );

    // Remove 'createdAt' from articleData
    delete articleData.createdAt;

    const article = await this.articleRepository.findOne({ slug }, { populate: ['author'] });

    const acquireLock = await this.lockArticle(userId, slug);

    if (!acquireLock) {
      throw new Error('Article is already locked');
    }

    if (articleData.coAuthors && articleData.coAuthors.trim() !== '') {
      // Step 1: Convert comma-separated string to array of strings
      const coAuthorsEmails = articleData.coAuthors.split(',').map((email: string) => email.trim());

      // Step 2 & 3: Check if users with given emails exist and fetch user data
      const coAuthors = await Promise.all(coAuthorsEmails.map(async (email: string) => {
        const coAuthor = await this.userRepository.findOne({ email });
        if (!coAuthor) {
          throw new Error(`User with email ${email} not found`);
        }
        return coAuthor;
      }));

      // Step 4: Ensure current author is not included as co-author
      const currentAuthorIndex = coAuthors.findIndex(coAuthor => coAuthor === article?.author);
      if (currentAuthorIndex !== -1) {
        coAuthors.splice(currentAuthorIndex, 1);
      }

      // Step 5: Update the coAuthors field in the article entity
      if (coAuthors.length > 0) {
        articleData.coAuthors = coAuthors;
      } else {
        delete articleData.coAuthors;
      }
    } else {
      if (articleData.coAuthors && articleData.coAuthors.trim() === '' && userId === article?.author.id) {
        articleData.coAuthors = []
      } else {
        delete articleData.coAuthors;
      }
    }

    if (article && !article.coAuthors.isInitialized()) {
      await article.coAuthors.init();
    }

    wrap(article).assign(articleData);
    await this.em.flush();

    this.unlockArticle(slug);

    return { article: article!.toJSON(user!) };
  }

  async delete(slug: string) {
    return this.articleRepository.nativeDelete({ slug });
  }

  async lockArticle(userId: number, slug: string) {
    const user = await this.userRepository.findOne({ id: userId });
    const article = await this.articleRepository.findOne({ slug });
  
    if (!article || !user){
      return false; // Article not present for lock or user not found
    }
  
    const existingLock = await this.lockRepository.findOne({ article });
  
    if (!existingLock || existingLock.lockExpiration < new Date()) {
      if (existingLock) {
        await this.em.removeAndFlush(existingLock);
      }
      // Create a new lock if one doesn't exist or if the existing lock has expired
      const lock = new ArticleLock(article, user, new Date(Date.now() + 5 * 60 * 1000)); // Lock for 5 minutes
      await this.em.persistAndFlush(lock);
      return true; // Article locked successfully
    } else if (user.id === existingLock.lockedBy.id) {
      // User is attempting to lock the article again, update lock expiration by 5 minutes
      existingLock.lockExpiration = new Date(Date.now() + 5 * 60 * 1000);
      await this.em.flush(); // Save changes
      return true; // Lock updated successfully
    }
    
    return false; // Article is already locked by another user
  }
  
  async unlockArticle(slug: string) {
    const article = await this.articleRepository.findOne({ slug });
    
    if (article) {
      const existingLock = await this.lockRepository.findOne({ article });
  
      if (existingLock) {
        await this.em.removeAndFlush(existingLock);
      }
  
      return true; // Article unlocked successfully
    }
  
    return false; // Article not found
  }
  
  
}
