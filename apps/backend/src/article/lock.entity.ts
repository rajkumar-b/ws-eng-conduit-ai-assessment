import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { User } from '../user/user.entity';
import { Article } from './article.entity';

@Entity()
export class ArticleLock {

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Article)
  article: Article;
  
  @ManyToOne(() => User)
  lockedBy: User;

  @Property({ type: 'date'})
  lockExpiration: Date ;

  constructor(article: Article, lockedBy: User, lockExpiration: Date) {
    this.lockedBy = lockedBy;
    this.article = article;
    this.lockExpiration = lockExpiration;
  }

}
