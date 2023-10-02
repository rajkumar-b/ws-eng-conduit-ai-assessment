import { DynamicFormComponent, Field, formsActions, ListErrorsComponent, ngrxFormsQuery } from '@realworld/core/forms';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { OnDestroy, Input } from '@angular/core';
import { Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { articleActions, articleEditActions, articleQuery } from '@realworld/articles/data-access';

const structure: Field[] = [
  {
    type: 'INPUT',
    name: 'title',
    placeholder: 'Article Title',
    validator: [Validators.required],
  },
  {
    type: 'INPUT',
    name: 'description',
    placeholder: "What's this article about?",
    validator: [Validators.required],
  },
  {
    type: 'TEXTAREA',
    name: 'body',
    placeholder: 'Write your article (in markdown)',
    validator: [Validators.required],
  },
  {
    type: 'INPUT',
    name: 'tagList',
    placeholder: 'Enter Tags',
    validator: [],
  },
  {
    type: 'INPUT',
    name: 'coAuthors',
    placeholder: 'Enter Co-Authors (comma-separated emails)',
    validator: [],
  },
];

@UntilDestroy()
@Component({
  selector: 'cdt-article-edit',
  standalone: true,
  templateUrl: './article-edit.component.html',
  styleUrls: ['./article-edit.component.css'],
  imports: [DynamicFormComponent, ListErrorsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleEditComponent implements OnInit, OnDestroy {
  @Input() isEditMode: boolean = false; // Input property to indicate the mode
  structure$ = this.store.select(ngrxFormsQuery.selectStructure);
  data$ = this.store.select(ngrxFormsQuery.selectData);
  formStructure: Field[] = [];

  constructor(private readonly store: Store, private route: ActivatedRoute) {}

  ngOnInit() {
    // Conditionally set the structure based on mode
    this.route.queryParams.subscribe(params => {
      const isEditMode = params['isEditMode'];
      this.isEditMode = isEditMode !== undefined && isEditMode === 'true';
    });

    if (this.isEditMode) {
      this.formStructure = [...structure];
    } else {
      this.formStructure = [...structure.filter(field => field.name !== 'coAuthors')]; // Exclude co-authors field
    }
    
    this.store.dispatch(formsActions.setStructure({ structure: this.formStructure }));

    this.store
    .select(articleQuery.selectData)
    .pipe(untilDestroyed(this))
    .subscribe((article) => {
      if (article && article.coAuthors && article.coAuthors.length > 0) {
        const coAuthorEmails = article.coAuthors.map(coAuthor => coAuthor.email).join(',');
        const updatedData = { ...article, coAuthors: coAuthorEmails };
        this.store.dispatch(formsActions.setData({ data: updatedData }));
      } else {
        const updatedData = { ...article, coAuthors: '' };
        this.store.dispatch(formsActions.setData({ data: updatedData }));
      }
    });

  }

  updateForm(changes: any) {
    this.store.dispatch(formsActions.updateData({ data: changes }));
  }

  submit() {
    this.store.dispatch(articleEditActions.publishArticle());
  }

  ngOnDestroy() {
    this.store.dispatch(formsActions.initializeForm());
  }
}
