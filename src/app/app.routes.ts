import { Routes } from '@angular/router';
import { authGuard, guestGuard, landingGuard } from './guard/auth-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home'
  },
  {
    path: 'home',
    canMatch: [authGuard], // or canActivate: [authGuard]
    loadComponent: () => import('./pages/home/home.page').then( m => m.HomePage)
  },
  {
    path: 'profile',
    canMatch: [authGuard], // or canActivate: [authGuard]
    loadComponent: () => import('./pages/profile/profile.page').then( m => m.ProfilePage)
  },
  {
    path: 'landing-page',
    loadComponent: () => import('./pages/landing-page/landing-page.page').then( m => m.LandingPagePage)
  },
  {
    path: 'login',
    canMatch: [guestGuard], // block if already logged in
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then( m => m.RegisterPage)
  },
  {
    path: 'otp',
    loadComponent: () => import('./pages/otp/otp.page').then( m => m.OtpPage)
  },
  {
    path: 'send-verification',
    loadComponent: () => import('./pages/send-verification/send-verification.page').then( m => m.SendVerificationPage)
  },
  {
    path: 'alphabet',
    loadComponent: () => import('./pages/alphabet/alphabet.page').then( m => m.AlphabetPage)
  },
  {
    path: 'lessons',
    loadComponent: () => import('./pages/lessons/lessons.page').then( m => m.LessonsPage)
  },
  {
    path: 'lessons/:category',
    loadComponent: () => import('./pages/lessons/category/category.page').then(m => m.CategoryPage)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/reset-password/reset-password.page').then( m => m.ResetPasswordPage)
  },
  { path: '**', redirectTo: '' },
  {
    path: 'category',
    loadComponent: () => import('./pages/lessons/category/category.page').then( m => m.CategoryPage)
  },
];
