import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LayoutService } from '../../services/layout.service';
import { ToastComponent } from '../../components/toast/toast.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ToastComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent implements OnInit {
  adminName = 'Admin';
  initials = 'AD';

  constructor(public layout: LayoutService, private auth: AuthService, private router: Router) {}

  ngOnInit() {
    const user = this.auth.getUser();
    if (user) {
      this.adminName = user.name || 'Admin';
      this.initials = (user.name || 'AD').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
