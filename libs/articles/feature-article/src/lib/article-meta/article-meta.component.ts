import { Component, Input, ChangeDetectionStrategy, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Article, Profile } from '@realworld/core/api-types';
import { ArticlesService } from '@realworld/articles/data-access/src/lib/services/articles.service';

@Component({
  selector: 'cdt-article-meta',
  standalone: true,
  templateUrl: './article-meta.component.html',
  styleUrls: ['./article-meta.component.css'],
  imports: [RouterModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleMetaComponent {
  @Input() article!: Article;
  @Input() isAuthenticated!: boolean;
  @Input() canModify!: boolean;
  @Input() currentUser!: Profile;
  @Output() follow: EventEmitter<string> = new EventEmitter<string>();
  @Output() unfollow: EventEmitter<string> = new EventEmitter<string>();
  @Output() unfavorite: EventEmitter<string> = new EventEmitter();
  @Output() favorite: EventEmitter<string> = new EventEmitter();
  @Output() delete: EventEmitter<string> = new EventEmitter();
  articleLocked:boolean = false;

  constructor(private articlesService: ArticlesService, private route: ActivatedRoute, private router: Router,  private cdRef: ChangeDetectorRef) { }

  editArticle() {
    const articleSlug = this.article.slug;
    
    this.articlesService.lockArticle(articleSlug).subscribe(lockAcquired => {
      if (lockAcquired) {
        this.articleLocked = false;
        this.router.navigate(['/editor', this.article.slug], {
          queryParams: {
            isEditMode: this.article.author.email === this.currentUser.email,
          }
        });
      } else {
        this.articleLocked = true;
        this.cdRef.detectChanges();
      }
    });
  }

  toggleFavorite() {
    if (this.article.favorited) {
      this.unfavorite.emit(this.article.slug);
    } else {
      this.favorite.emit(this.article.slug);
    }
  }

  toggleFollow(user: Profile) {
    if (user.following) {
      this.unfollow.emit(user.username);
    } else {
      this.follow.emit(user.username);
    }
  }

  deleteArticle() {
    this.delete.emit(this.article.slug);
  }
}
