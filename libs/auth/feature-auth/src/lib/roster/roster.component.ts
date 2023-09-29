import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { AuthService } from '@realworld/auth/data-access/src/lib/services/auth.service';

@Component({
  selector: 'cdt-app-roster',
  standalone: true,
  templateUrl: './roster.component.html',
  styleUrls: ['./roster.component.css'],
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class RosterComponent {
  users$ = this.authService.userstat().pipe(
    catchError(error => {
      console.error('Error fetching user stats:', error);
      // Handle the error, e.g., show a message to the user
      return [];
    })
  );
  constructor(private readonly authService: AuthService) {}
}
