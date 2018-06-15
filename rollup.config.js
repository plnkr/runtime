/* eslint-env node */

//@ts-check
'use strict';

const Typescript = require('typescript');
const commonjsPlugin = require('rollup-plugin-commonjs');
const nodeResolvePlugin = require('rollup-plugin-node-resolve');
const typescriptPlugin = require('rollup-plugin-typescript');

const Package = require('./package.json');

module.exports = [
    {
        experimentalDynamicImport: true,
        input: 'src/index.ts',
        output: {
            file: Package['main'],
            format: 'umd',
            name: Package['name'],
            sourcemap: true,
        },
        plugins: [
            nodeResolvePlugin({
                jsnext: false,
                module: true,
                browser: true,
                extensions: ['.js', '.json'],
                main: true,
            }),
            commonjsPlugin({
                include: 'node_modules/**', // Default: undefined
                ignoreGlobal: true,
                ignore: ['fs'],
            }),
            typescriptPlugin({
                target: 'es5',
                typescript: Typescript,
            }),
        ],
    },
    {
        experimentalDynamicImport: true,
        input: 'src/index.ts',
        output: {
            file: Package['module'],
            format: 'es',
            name: Package['name'],
            sourcemap: true,
        },
        plugins: [
            nodeResolvePlugin({
                jsnext: false,
                module: true,
                browser: true,
                extensions: ['.js', '.json'],
                main: true,
            }),
            commonjsPlugin({
                include: 'node_modules/**', // Default: undefined
                ignoreGlobal: true,
                ignore: ['fs'],
            }),
            typescriptPlugin({
                target: 'es2018',
                typescript: Typescript,
            }),
        ],
    },
];
