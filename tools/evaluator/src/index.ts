#!/usr/bin/env node
import { buildCLI } from './cli.js';

const program = buildCLI();
program.parse(process.argv);
