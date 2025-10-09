import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActionSheetController, IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonNote, IonText, IonTitle, IonToolbar, Platform } from '@ionic/angular/standalone';
import { Router, RouterModule } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { addIcons } from 'ionicons';
import { arrowBack } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { ScrollService } from '../../services/scroll.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,

    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    // Standalone Ionic components you actually use:
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonItem, IonLabel, IonInput, IonNote, IonButton, IonButtons, IonBackButton,
    IonIcon, IonText, IonFooter
  ]
})
export class ProfilePage implements OnInit {

  displayName;
  email;
  showShadow = false;
  @ViewChild(IonContent, { static: true }) content!: IonContent;
  constructor(
    private readonly storageService: StorageService,
    private readonly authService: AuthService,
    private actionSheetController: ActionSheetController,
    private platform: Platform,
    public scrollService: ScrollService,
    private router: Router) {
    addIcons({ arrowBack });
    this.scrollService.scrollTop$.subscribe(res=> {
      console.log(res);
      this.showShadow = res > 0;
    });
  }

  ngOnInit() {
    this.storageService.getSavedProfile().then(profile => {
      if (profile) {
        this.email = profile.email;
        this.displayName = profile.name;
        console.log('HomePage: profile loaded on init', profile);
      } else {
        console.log('HomePage: no profile found on init');
      }
    });
  }

  ngAfterViewInit() {
    this.scrollService.register(this.content);
  }

  async onLogout() {
    const sheet = await this.actionSheetController.create({
      header: 'Are you sure you want to logout?',
      buttons: [
      {
        text: 'Yes, Logout',
        handler: async () => {
          this.authService.logout();
          this.router.navigateByUrl('/login', { replaceUrl: true });
        },
      },
      {
        text: 'Cancel',
        cssClass: 'close dismiss cancel',
        handler: async () => { this.actionSheetController.dismiss(); },
      }
    ] });
    await sheet.present();
  }

}
