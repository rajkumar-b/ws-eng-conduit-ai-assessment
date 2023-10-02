import { createSelector } from '@ngrx/store';
import { articleFeature } from './article.reducer';

export const { selectArticleState, selectComments, selectData, selectLoaded, selectLoading } = articleFeature;
export const getAuthorUsername = createSelector(selectData, (data) => data.author.username);

export const getAuthors = createSelector(
  selectData,
  (data) => {
    const authors = [];
    
    // Add the main author's email
    if (data.author && data.author.email) {
      authors.push(data.author.email);
    }

    // Add co-authors' emails
    if (data.coAuthors && data.coAuthors.length > 0) {
      data.coAuthors.forEach((coAuthor) => {
        if (coAuthor.email) {
          authors.push(coAuthor.email);
        }
      });
    }

    return authors;
  }
);

export const articleQuery = {
  selectArticleState,
  selectComments,
  selectData,
  selectLoaded,
  selectLoading,
  getAuthorUsername,
  getAuthors,
};
