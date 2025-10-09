import { Injectable } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScrollService {
  private scrollTopSubject = new BehaviorSubject<number>(0);
  scrollTop$ = this.scrollTopSubject.asObservable();

  private content?: IonContent;
  async register(content: IonContent) {
    this.content = content;
    if(this.content) {
      this.content.scrollEvents = true;
      this.content.ionScroll.subscribe(res=> {
        this.scrollTopSubject.next(res.detail.scrollTop);
      });
    }
  }
}
