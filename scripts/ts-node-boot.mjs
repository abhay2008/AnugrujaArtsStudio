/** Registers scripts/ts-node-hooks.mjs (see that file). Used by the test:chat / test:e2e scripts. */
import { register } from 'node:module';

register(new URL('./ts-node-hooks.mjs', import.meta.url).href);
