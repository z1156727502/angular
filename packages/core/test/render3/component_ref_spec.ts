/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Injector, NgModuleRef, ViewEncapsulation} from '../../src/core';
import {ComponentFactory} from '../../src/linker/component_factory';
import {RendererFactory2} from '../../src/render/api';
import {injectComponentFactoryResolver} from '../../src/render3/component_ref';
import {defineComponent} from '../../src/render3/index';
import {domRendererFactory3} from '../../src/render3/interfaces/renderer';
import {Sanitizer} from '../../src/sanitization/security';

describe('ComponentFactory', () => {
  const cfr = injectComponentFactoryResolver();

  describe('constructor()', () => {
    it('should correctly populate public properties', () => {
      class TestComponent {
        static ngComponentDef = defineComponent({
          type: TestComponent,
          encapsulation: ViewEncapsulation.None,
          selectors: [['test', 'foo'], ['bar']],
          consts: 0,
          vars: 0,
          template: () => undefined,
          factory: () => new TestComponent(),
          inputs: {
            in1: 'in1',
            in2: ['input-attr-2', 'in2'],
          },
          outputs: {
            out1: 'out1',
            out2: 'output-attr-2',
          },
        });
      }

      const cf = cfr.resolveComponentFactory(TestComponent);

      expect(cf.componentType).toBe(TestComponent);
      expect(cf.ngContentSelectors).toEqual([]);
      expect(cf.selector).toBe('test');

      expect(cf.inputs).toEqual([
        {propName: 'in1', templateName: 'in1'},
        {propName: 'in2', templateName: 'input-attr-2'},
      ]);
      expect(cf.outputs).toEqual([
        {propName: 'out1', templateName: 'out1'},
        {propName: 'out2', templateName: 'output-attr-2'},
      ]);
    });
  });

  describe('create()', () => {
    let createRenderer2Spy: jasmine.Spy;
    let createRenderer3Spy: jasmine.Spy;
    let cf: ComponentFactory<any>;

    beforeEach(() => {
      createRenderer2Spy =
          jasmine.createSpy('RendererFactory2#createRenderer').and.returnValue(document),
      createRenderer3Spy = spyOn(domRendererFactory3, 'createRenderer').and.callThrough();

      class TestComponent {
        static ngComponentDef = defineComponent({
          type: TestComponent,
          encapsulation: ViewEncapsulation.None,
          selectors: [['test']],
          consts: 0,
          vars: 0,
          template: () => undefined,
          factory: () => new TestComponent(),
        });
      }

      cf = cfr.resolveComponentFactory(TestComponent);
    });

    describe('(when `ngModuleRef` is not provided)', () => {
      it('should retrieve `RendererFactory2` from the specified injector', () => {
        const injector = Injector.create([
          {provide: RendererFactory2, useValue: {createRenderer: createRenderer2Spy}},
        ]);

        cf.create(injector);

        expect(createRenderer2Spy).toHaveBeenCalled();
        expect(createRenderer3Spy).not.toHaveBeenCalled();
      });

      it('should fall back to `domRendererFactory3` if `RendererFactory2` is not provided', () => {
        const injector = Injector.create([]);

        cf.create(injector);

        expect(createRenderer2Spy).not.toHaveBeenCalled();
        expect(createRenderer3Spy).toHaveBeenCalled();
      });

      it('should retrieve `Sanitizer` from the specified injector', () => {
        const sanitizerFactorySpy = jasmine.createSpy('sanitizerFactory').and.returnValue({});
        const injector = Injector.create([
          {provide: Sanitizer, useFactory: sanitizerFactorySpy, deps: []},
        ]);

        cf.create(injector);

        expect(sanitizerFactorySpy).toHaveBeenCalled();
      });
    });

    describe('(when `ngModuleRef` is provided)', () => {
      it('should retrieve `RendererFactory2` from the specified injector first', () => {
        const injector = Injector.create([
          {provide: RendererFactory2, useValue: {createRenderer: createRenderer2Spy}},
        ]);
        const mInjector = Injector.create([
          {provide: RendererFactory2, useValue: {createRenderer: createRenderer3Spy}},
        ]);

        cf.create(injector, undefined, undefined, { injector: mInjector } as NgModuleRef<any>);

        expect(createRenderer2Spy).toHaveBeenCalled();
        expect(createRenderer3Spy).not.toHaveBeenCalled();
      });

      it('should retrieve `RendererFactory2` from the `ngModuleRef` if not provided by the injector',
         () => {
           const injector = Injector.create([]);
           const mInjector = Injector.create([
             {provide: RendererFactory2, useValue: {createRenderer: createRenderer2Spy}},
           ]);

           cf.create(injector, undefined, undefined, { injector: mInjector } as NgModuleRef<any>);

           expect(createRenderer2Spy).toHaveBeenCalled();
           expect(createRenderer3Spy).not.toHaveBeenCalled();
         });

      it('should fall back to `domRendererFactory3` if `RendererFactory2` is not provided', () => {
        const injector = Injector.create([]);
        const mInjector = Injector.create([]);

        cf.create(injector, undefined, undefined, { injector: mInjector } as NgModuleRef<any>);

        expect(createRenderer2Spy).not.toHaveBeenCalled();
        expect(createRenderer3Spy).toHaveBeenCalled();
      });

      it('should retrieve `Sanitizer` from the specified injector first', () => {
        const iSanitizerFactorySpy =
            jasmine.createSpy('Injector#sanitizerFactory').and.returnValue({});
        const injector = Injector.create([
          {provide: Sanitizer, useFactory: iSanitizerFactorySpy, deps: []},
        ]);

        const mSanitizerFactorySpy =
            jasmine.createSpy('NgModuleRef#sanitizerFactory').and.returnValue({});
        const mInjector = Injector.create([
          {provide: Sanitizer, useFactory: mSanitizerFactorySpy, deps: []},
        ]);

        cf.create(injector, undefined, undefined, { injector: mInjector } as NgModuleRef<any>);

        expect(iSanitizerFactorySpy).toHaveBeenCalled();
        expect(mSanitizerFactorySpy).not.toHaveBeenCalled();
      });

      it('should retrieve `Sanitizer` from the `ngModuleRef` if not provided by the injector',
         () => {
           const injector = Injector.create([]);

           const mSanitizerFactorySpy =
               jasmine.createSpy('NgModuleRef#sanitizerFactory').and.returnValue({});
           const mInjector = Injector.create([
             {provide: Sanitizer, useFactory: mSanitizerFactorySpy, deps: []},
           ]);


           cf.create(injector, undefined, undefined, { injector: mInjector } as NgModuleRef<any>);

           expect(mSanitizerFactorySpy).toHaveBeenCalled();
         });
    });
  });
});
