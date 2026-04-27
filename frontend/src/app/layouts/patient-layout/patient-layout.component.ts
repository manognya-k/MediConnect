import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LayoutService } from '../../services/layout.service';
import { ToastComponent } from '../../components/toast/toast.component';

@Component({
  selector: 'app-patient-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ToastComponent],
  templateUrl: './patient-layout.component.html',
  styleUrl: './patient-layout.component.scss'
})
export class PatientLayoutComponent implements OnInit {
  patientName = 'Patient';
  initials = 'P';

  constructor(
    public layout: LayoutService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    const user = this.auth.getUser();
    if (user) {
      this.patientName = user.name || 'Patient';
      const parts = (user.name || '').split(' ');
      this.initials = parts.map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'P';
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
