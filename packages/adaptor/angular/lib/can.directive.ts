import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { RBACService } from './rbac.service';

/**
 * Structural directive to conditionally render content based on permission
 *
 * Usage:
 * <div *fsCanPermission="'post:write'">Content</div>
 */
@Directive({
  selector: '[fsCanPermission]',
  standalone: true
})
export class CanPermissionDirective implements OnInit, OnDestroy {
  @Input() fsCanPermission!: string;

  private subscription?: Subscription;
  private hasView = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private rbacService: RBACService
  ) {}

  ngOnInit(): void {
    this.subscription = this.rbacService.can$(this.fsCanPermission).subscribe(allowed => {
      if (allowed && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!allowed && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}

/**
 * Structural directive to conditionally render content based on role
 *
 * Usage:
 * <div *fsHasRole="'admin'">Content</div>
 */
@Directive({
  selector: '[fsHasRole]',
  standalone: true
})
export class HasRoleDirective implements OnInit, OnDestroy {
  @Input() fsHasRole!: string;

  private subscription?: Subscription;
  private hasView = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private rbacService: RBACService
  ) {}

  ngOnInit(): void {
    this.subscription = this.rbacService.hasRole$(this.fsHasRole).subscribe(hasRole => {
      if (hasRole && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!hasRole && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}

/**
 * Structural directive to conditionally render content when permission is NOT present
 *
 * Usage:
 * <div *fsCannotPermission="'post:write'">Upgrade message</div>
 */
@Directive({
  selector: '[fsCannotPermission]',
  standalone: true
})
export class CannotPermissionDirective implements OnInit, OnDestroy {
  @Input() fsCannotPermission!: string;

  private subscription?: Subscription;
  private hasView = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private rbacService: RBACService
  ) {}

  ngOnInit(): void {
    this.subscription = this.rbacService.can$(this.fsCannotPermission).subscribe(allowed => {
      if (!allowed && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (allowed && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}

/**
 * Structural directive to conditionally render content when permission is denied
 *
 * Usage:
 * <div *fsDenied="'admin:delete'">This action is denied</div>
 */
@Directive({
  selector: '[fsDenied]',
  standalone: true
})
export class DeniedDirective implements OnInit, OnDestroy {
  @Input() fsDenied!: string;

  private subscription?: Subscription;
  private hasView = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private rbacService: RBACService
  ) {}

  ngOnInit(): void {
    this.subscription = this.rbacService.isDenied$(this.fsDenied).subscribe(isDenied => {
      if (isDenied && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!isDenied && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}

/**
 * Structural directive to conditionally render content when permission is NOT denied
 *
 * Usage:
 * <div *fsNotDenied="'admin:delete'">This action is allowed</div>
 */
@Directive({
  selector: '[fsNotDenied]',
  standalone: true
})
export class NotDeniedDirective implements OnInit, OnDestroy {
  @Input() fsNotDenied!: string;

  private subscription?: Subscription;
  private hasView = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private rbacService: RBACService
  ) {}

  ngOnInit(): void {
    this.subscription = this.rbacService.isDenied$(this.fsNotDenied).subscribe(isDenied => {
      if (!isDenied && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (isDenied && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
