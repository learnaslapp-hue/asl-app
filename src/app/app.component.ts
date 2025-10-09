import { Component } from '@angular/core';
import { ActionSheetController, IonApp, IonRouterOutlet, LoadingController, ModalController, Platform } from '@ionic/angular/standalone';
import { StorageService } from './services/storage.service';
import { StatusBarService } from './services/status-bar.service';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private backSub?: Subscription;
  constructor(
    private readonly platform: Platform,
    private readonly storageService: StorageService,
    private readonly statusBarService: StatusBarService,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly modalCtrl: ModalController,
    private readonly loadingCtrl: LoadingController, // from @ionic/angular
    private readonly authService: AuthService,
    private readonly actionSheetController: ActionSheetController,
  ) {
    this.backSub = this.platform.backButton.subscribeWithPriority(10, async () => {
      const modal = await this.modalCtrl.getTop();
      const activeSheet = await this.actionSheetController.getTop();
      const loading = await this.loadingCtrl.getTop();
      if (modal) {
        await modal.dismiss();
        return;
      }
      if (activeSheet) {
        await activeSheet.dismiss();
        return;
      }
      if (loading) {
        await loading.dismiss();
        return;
      }
      console.log('Current route:', this.router.url);

      const page = this.router.url;

      const extra = [];
      const defaultButtons = [
        {
          text: 'Minimize the app?',
          handler: async () => App.minimizeApp(),
        },
        {
          text: 'Close the app?',
          handler: async () => App.exitApp(),
        },
        {
          text: 'Back',
          cssClass: 'close dismiss cancel',
          handler: async () => { this.actionSheetController.dismiss(); },
        }
      ];
      if (page.includes("/login") || page.includes("/register")) {
        this.router.navigateByUrl("/landing-page", { replaceUrl: true });
        return;
      } else if (page.includes("/profile") || page.includes("/alphabet")) {
        this.router.navigateByUrl("/home", { replaceUrl: true });
        return;
      } else if (page.includes("/lessons")) {
        if(( /^\/lessons$/.test(page)))  {
          this.router.navigateByUrl("/home", { replaceUrl: true });
        } else {
          this.router.navigateByUrl("/lessons", { replaceUrl: true });
        }
        return;
      } else if (page.includes("/send-verification") || page.includes("/reset-password") || page.includes("/otp")) {
        return;
      } else if (page.includes("/home")) {
        extra.push(
          {
            text: 'Logout',
            handler: async () => {
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
                    handler: async () => { sheet.dismiss(); },
                  }
                ]
              });
              await sheet.present();
            },
          })
      } else {
      }
      const sheet = await this.actionSheetController.create({ buttons: [...extra, ...defaultButtons] });
      await sheet.present();

    });

    this.initializeStatusBar();
  }

  ionViewWillEnter() {
    this.initializeStatusBar();
  }

  ionViewWillLeave() {
    this.backSub?.unsubscribe();
    this.backSub = undefined;
  }

  initializeStatusBar() {
    // document.body.classList.add('status-bar-overlay');
    this.statusBarService.show(true);
    this.statusBarService.modifyStatusBar(Style.Light, "#ffffff");
    this.statusBarService.overLay(false);

  }

  ngOnInit(): void {

    this.storageService.getSavedProfile().then(profile => {
      if (profile) {
        console.log('AppComponent: profile loaded on init', profile);
        if (!profile?.progress) {
          profile.progress = {
            alphabet: {
              lastOpened: null,
              compeleted: [],
              status: "0%"
            },
            lessons: {
              lastOpened: "",
              compeleted: [],
              status: "0%"
            },
            quiz: {
              lastOpened: "",
              compeleted: [],
              status: "0%"
            },
          }
        }
        this.authService.setCurrentLogin(profile);
        this.storageService.saveProfile(profile);
      } else {
        console.log('AppComponent: no profile found on init');
      }
    });


    this.platform.ready().then(async () => {
      if (Capacitor.getPlatform() !== 'web') {
        this.initializeStatusBar();
      }
    });

  }

  ngOnDestroy() {
    this.backSub?.unsubscribe();
  }
}
