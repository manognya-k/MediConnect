import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { LayoutService } from '../../services/layout.service';
import { ToastComponent } from '../../components/toast/toast.component';

@Component({
  selector: 'app-doctor-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ToastComponent],
  templateUrl: './doctor-layout.component.html',
  styleUrl: './doctor-layout.component.scss'
})
export class DoctorLayoutComponent implements OnInit {
  doctorName = 'Dr. Sarah Johnson';
  doctorRole = 'Cardiologist';
  initials = 'SJ';

  constructor(public layout: LayoutService, private auth: AuthService, private router: Router) {}

  ngOnInit() {
    const user = this.auth.getUser();
    if (user) {
      this.doctorName = user.name || 'Dr. Sarah Johnson';
      const parts = (user.name || '').split(' ');
      this.initials = parts.map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'SJ';
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
