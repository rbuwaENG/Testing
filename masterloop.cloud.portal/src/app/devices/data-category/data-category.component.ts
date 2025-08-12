import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';


@Component({
  selector: 'app-data-category',
  templateUrl: './data-category.component.html',
  styleUrls: ['./data-category.component.scss']
})
export class DataCategoryComponent implements OnInit {

  MID: string;
  isMobile: boolean = false;

  constructor(private route: ActivatedRoute, private router: Router) {
    this.MID = route.snapshot.params['id'];
    /**Mobile UI trigger */
   if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (document.documentElement.clientWidth < 768)) {
    this.isMobile = true;
    }
  }

  ngOnInit() {
  }
  onResize() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (document.documentElement.clientWidth < 768)) {
      this.isMobile = true;
    } else {
      this.isMobile = false;
    }
  }
}
