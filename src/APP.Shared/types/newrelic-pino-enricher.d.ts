declare module '@newrelic/pino-enricher' {
  type MixinFn = (mergeObject: object, level: number) => object;
  function pino_enricher(): MixinFn;
  export = pino_enricher;
}
