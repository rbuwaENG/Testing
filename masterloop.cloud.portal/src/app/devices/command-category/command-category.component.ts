import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';

@Component({
  selector: 'app-command-category',
  templateUrl: './command-category.component.html',
  styleUrls: ['./command-category.component.scss']
})
export class CommandCategoryComponent {
  @Input() data: {}
  MID: string;
  
  constructor(private route: ActivatedRoute, private router: Router) {
    this.MID = route.snapshot.params['id'];
  }
  
}
