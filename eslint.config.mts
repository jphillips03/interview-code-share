import tseslint from 'typescript-eslint';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import angularTemplateParser from '@angular-eslint/template-parser';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import type { Linter } from 'eslint';

export default tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic
    ],
    plugins: {
      '@angular-eslint': angular,
    },
    rules: angular.configs.recommended.rules as Record<string, Linter.RuleEntry>
  },
  {
    files: ['**/*.html'],
    // Registers the template-specific parsing rules
    languageOptions: {
      parser: angularTemplateParser,
    },
    plugins: {
      '@angular-eslint/template': angularTemplate,
    },
    rules: {
      // Manually load the structural template configurations
      ...angularTemplate.configs.recommended.rules as Record<string, Linter.RuleEntry>,
      ...angularTemplate.configs.accessibility.rules as Record<string, Linter.RuleEntry>
    }
  },
  eslintPluginPrettierRecommended 
);