import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, inject, Input, OnInit, Output, ViewChild } from '@angular/core';
import { IonSpinner } from '@ionic/angular/standalone';
import { AutoplayMuteDirective } from 'src/app/directives/autoplay-mute.directive';
import { User } from 'src/app/model/user';
import { SafeUrlPipe } from 'src/app/pipes/safe-url.pipe';
import { ScrollService } from 'src/app/services/scroll.service';

@Component({
  selector: 'app-video-player',
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss'],
  standalone: true,
  imports: [CommonModule, IonSpinner, SafeUrlPipe, AutoplayMuteDirective]
})
export class VideoPlayerComponent implements OnInit {
  @Input("src") src: string = null;
  @Input("fullHeight") fullHeight: boolean = false;


  @ViewChild('vid', { static: true }) vid!: ElementRef<HTMLVideoElement>;
  loading = true;

  @Output() loadstart = new EventEmitter();
  @Output() loadedmetadata = new EventEmitter();
  @Output() canplay = new EventEmitter();
  @Output() playing = new EventEmitter();
  @Output() timeupdate = new EventEmitter();
  @Output() seeking = new EventEmitter();
  @Output() seeked = new EventEmitter();
  @Output() ratechange = new EventEmitter();
  @Output() ended = new EventEmitter();
  @Output() error = new EventEmitter<ErrorEvent>();
  constructor(
    public scrollService: ScrollService,
  ) { }

  ngOnInit() {
  }
}
