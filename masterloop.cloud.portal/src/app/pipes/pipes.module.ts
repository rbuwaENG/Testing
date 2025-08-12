import { NgModule } from '@angular/core';
import { ConvertDecimal } from './double-convert.pipe';
import { ObjectKeys } from './object-keys.pipe';

@NgModule({
    declarations: [ConvertDecimal, ObjectKeys],
    exports: [ConvertDecimal, ObjectKeys]
})
export class PipeModule {
    static forRoot() {
        return {
            ngModule: PipeModule,
            providers: []
        };
    }
} 