import { EntityRepository } from '@mikro-orm/mysql';
import { User } from './user.entity';
import { IUserStatsRO } from './user.interface';

export class UserRepository extends EntityRepository<User> {
  async getUsersWithStats(): Promise<IUserStatsRO[]> {
    const users = await this.findAll({ populate: ['articles', 'favorites'] });

    const userStats = users.map((user) => {
      const articles = user.articles.getItems();

      articles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const likesReceivedCount = articles.reduce((totalLikes, article) => totalLikes + article.favoritesCount, 0);

      return {
        id: user.id,
        username: user.username,
        articlesCount: articles.length,
        likesReceivedCount,
        firstArticleDate: articles.length > 0 ? articles[0].createdAt : null,
      };
    });

    return userStats;
  }
}
