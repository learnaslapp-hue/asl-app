// src/app/login/login.page.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Ionic standalone UI pieces ONLY (no IonicModule here!)
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonNote, IonButton, IonIcon, IonButtons,
  IonText,
  IonBackButton,
  Platform
} from '@ionic/angular/standalone';

// Controllers/services come from @ionic/angular
import { ToastController, LoadingController, IonicModule } from '@ionic/angular';

import { AuthService } from '../../services/auth.service';

import { addIcons } from 'ionicons';
import { eye, eyeOff, arrowBack } from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { ScrollService } from '../../services/scroll.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    // Standalone Ionic components you actually use:
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonItem, IonLabel, IonInput, IonNote, IonButton, IonButtons, IonBackButton,
    IonIcon, IonText
  ]
})
export class RegisterPage implements OnInit {
  showPassword = false;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    password: [null, [Validators.required, Validators.minLength(6)]],
  });

  private registerSub?: Subscription;
  private backSub?: Subscription;

  @ViewChild(IonContent, { static: true }) content!: IonContent;
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastCtrl: ToastController,     // from @ionic/angular
    private loadingCtrl: LoadingController, // from @ionic/angular
    private platform: Platform,
    public scrollService: ScrollService
  ) {
    this.backSub = this.platform.backButton.subscribeWithPriority(10, async () => {
      this.registerSub?.unsubscribe();
      this.router.navigateByUrl('/landing-page', { replaceUrl: true });
    });
    addIcons({ eye, eyeOff, arrowBack });
  }

  ionViewWillLeave() {
    this.backSub?.unsubscribe();
    this.backSub = undefined;
  }

  ngOnInit(): void {
    // no throw here
  }

  ngAfterViewInit() {
    this.scrollService.register(this.content);
  }

  ngOnDestroy() {
    this.registerSub?.unsubscribe();
    this.backSub?.unsubscribe();
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showToast('Please fill in valid credentials.');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Signing up...', spinner: 'circles' });
    await loading.present();

    const { name, email, password } = this.form.value as { name: string; email: string; password: string };

    this.registerSub = this.authService.register({ name, email, password }).subscribe(async (res) => {
        await loading.dismiss();
        console.log('Register response', res);
        if(res.success) {
          this.router.navigate(['/otp'], {
            replaceUrl: true,
            state: {
              name, email, password, type: 'verify', backUrl: 'register'
            }
          });
        } else {
          if(res?.message.toLowerCase().includes('user already exists')) {
            this.form.controls.email.setErrors({ userExists: true });
          }
          this.showToast(res?.message || 'Signup failed.');
        }
      }, async (err) => {
        await loading.dismiss();
        this.showToast(err?.message || 'Signup failed.');
      });
  }

  private async showToast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2200, position: 'bottom' });
    await t.present();
  }

  get name() { return this.form.get('name'); }
  get email() { return this.form.get('email'); }
  get password() { return this.form.get('password'); }
}
