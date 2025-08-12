import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-security-category',
  templateUrl: './security-category.component.html',
  styleUrls: ['./security-category.component.scss']
})
export class SecurityCategoryComponent {

  MID: string;

  constructor(private route: ActivatedRoute, private router: Router) {
    this.MID = route.snapshot.params['id'];
  }

}
