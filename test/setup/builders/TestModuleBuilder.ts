import { Test, TestingModule } from '@nestjs/testing';

/**
 * Test Module Builder
 * 
 * Fluent builder pattern for creating NestJS testing modules.
 * Makes test setup cleaner and more readable.
 * 
 * @example
 * const builder = new TestModuleBuilder()
 *   .addClassProvider(YourService, YourService)
 *   .addProvider(DataSource, mockDataSource)
 *   .addProvider(ILogger, mockLogger);
 * const module = await builder.compile();
 * const service = module.get(YourService);
 */
export class TestModuleBuilder {
  private providers: any[] = [];
  private imports: any[] = [];
  private controllers: any[] = [];

  /**
   * Add a provider with a mock value
   * 
   * @param token - Dependency injection token
   * @param mock - Mock value to inject
   * @returns Builder instance for chaining
   */
  addProvider(token: any, mock: any): this {
    this.providers.push({
      provide: token,
      useValue: mock,
    });
    return this;
  }

  /**
   * Add a provider with a class
   * 
   * @param token - Dependency injection token
   * @param classType - Class to instantiate
   * @returns Builder instance for chaining
   */
  addClassProvider(token: any, classType: any): this {
    this.providers.push({
      provide: token,
      useClass: classType,
    });
    return this;
  }

  /**
   * Add a module import
   * 
   * @param module - Module to import
   * @returns Builder instance for chaining
   */
  addImport(module: any): this {
    this.imports.push(module);
    return this;
  }

  /**
   * Add a controller
   * 
   * @param controller - Controller class
   * @returns Builder instance for chaining
   */
  addController(controller: any): this {
    this.controllers.push(controller);
    return this;
  }

  /**
   * Compile the testing module
   * 
   * @returns Compiled testing module
   */
  async compile(): Promise<TestingModule> {
    const moduleConfig: any = {};

    if (this.providers.length > 0) {
      moduleConfig.providers = this.providers;
    }

    if (this.imports.length > 0) {
      moduleConfig.imports = this.imports;
    }

    if (this.controllers.length > 0) {
      moduleConfig.controllers = this.controllers;
    }

    return Test.createTestingModule(moduleConfig).compile();
  }
}

