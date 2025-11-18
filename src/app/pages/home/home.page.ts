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
  IonProgressBar,
  ActionSheetController,
  ModalController,
  Platform
} from '@ionic/angular/standalone';

// Controllers/services come from @ionic/angular
import { ToastController, LoadingController, IonicModule } from '@ionic/angular';

import { AuthService } from '../../services/auth.service';

import { addIcons } from 'ionicons';
import { personCircle } from 'ionicons/icons';
import { StorageService } from '../../services/storage.service';
import { App } from '@capacitor/app';
import { ScrollService } from '../../services/scroll.service';
import { User } from '../model/user';
import { APIKeyManagementService } from 'src/app/services/api-key-management.service';
import { Subscription } from 'rxjs';
import { QuizStatusService } from 'src/app/services/quiz-status.service';
import { QuizStatus } from 'src/app/model/quiz-status';


@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule, IonContent,
    IonHeader, IonToolbar, IonTitle, IonButtons,
    IonIcon, IonCard, IonCardContent, IonProgressBar]
})
export class HomePage implements OnInit {
  currentProfile: User;
  quizStatus!: QuizStatus;
  private apiKeySub?: Subscription;
  @ViewChild(IonContent, { static: true }) content!: IonContent;
  constructor(
    private readonly storageService: StorageService,
    private readonly authService: AuthService,
    public scrollService: ScrollService,
    private statusSvc: QuizStatusService,
    private readonly apiKeyManagementService: APIKeyManagementService,
  ) {
    this.loadStatus();
    addIcons({ personCircle });
  }

  ngOnInit() {
    this.authService.user$.subscribe(res=> {
      this.currentProfile = res;
    });
  }

  ionViewWillEnter() {
    this.loadStatus();
    this.loadAPIKey();
  }

  ngAfterViewInit() {
    this.scrollService.register(this.content);
  }

  ngOnDestroy() {
    this.apiKeySub?.unsubscribe();
  }

  private loadAPIKey() {
    if(!this.apiKeyManagementService?.currentAPIKey?.apiKey) {
      this.apiKeySub = this.apiKeyManagementService.get().subscribe(res=> {
        if(res && res.data) {
          this.storageService.saveAPIKey(res.data);
          this.apiKeyManagementService.setCurrentAPIKey(res.data);
        }
      });
    }
  }

  private async loadStatus() {
    this.quizStatus = await this.statusSvc.load();
  }

}
