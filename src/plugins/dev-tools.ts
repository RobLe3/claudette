/**
 * Plugin Development Tools
 * 
 * Utilities and tools to help developers create and test Claudette plugins.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { PluginMetadata, PluginCategory, PluginTemplates } from './plugin-sdk';

// Plugin Scaffolding
export class PluginScaffolder {
  /**
   * Create a new plugin project structure
   */
  static createPlugin(options: PluginScaffoldOptions): void {
    const {
      name,
      category,
      outputPath,
      typescript = true,
      includeTests = true,
      includeDocs = true
    } = options;

    // Create directory structure
    mkdirSync(join(outputPath, name), { recursive: true });
    mkdirSync(join(outputPath, name, 'src'));
    
    if (includeTests) {
      mkdirSync(join(outputPath, name, 'tests'));
    }
    
    if (includeDocs) {
      mkdirSync(join(outputPath, name, 'docs'));
    }

    // Generate package.json
    const packageJson = {
      name: `claudette-plugin-${name}`,
      version: '1.0.0',
      description: `Claudette ${category} plugin`,
      main: typescript ? 'dist/index.js' : 'src/index.js',
      types: typescript ? 'dist/index.d.ts' : undefined,
      scripts: {
        build: typescript ? 'tsc' : undefined,
        test: includeTests ? 'jest' : undefined,
        dev: 'claudette-dev-plugin',
        publish: 'npm publish'
      },
      keywords: ['claudette', 'plugin', category],
      author: 'Your Name',
      license: 'MIT',
      peerDependencies: {
        'claudette': '^2.0.0'
      },
      devDependencies: typescript ? {
        'typescript': '^4.9.0',
        '@types/node': '^18.0.0',
        'jest': includeTests ? '^29.0.0' : undefined
      } : {},
      claudette: {
        category,
        version: '2.0.0'
      }
    };

    writeFileSync(
      join(outputPath, name, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Generate TypeScript config if needed
    if (typescript) {
      const tsConfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          declaration: true,
          declarationMap: true,
          sourceMap: true
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist', 'tests']
      };

      writeFileSync(
        join(outputPath, name, 'tsconfig.json'),
        JSON.stringify(tsConfig, null, 2)
      );
    }

    // Generate main plugin file
    const template = this.getTemplate(category);
    const extension = typescript ? 'ts' : 'js';
    writeFileSync(
      join(outputPath, name, 'src', `index.${extension}`),
      template.replace(/MyBackendPlugin|MyRAGPlugin/g, this.toPascalCase(name) + 'Plugin')
        .replace(/my-backend|my-rag/g, name)
        .replace(/my-backend-plugin|my-rag-plugin/g, name + '-plugin')
    );

    // Generate README
    if (includeDocs) {
      const readme = this.generateReadme(name, category);
      writeFileSync(join(outputPath, name, 'README.md'), readme);
    }

    // Generate test file
    if (includeTests) {
      const testTemplate = this.getTestTemplate(category, name, typescript);
      writeFileSync(
        join(outputPath, name, 'tests', `index.test.${extension}`),
        testTemplate
      );
    }

    console.log(`Plugin ${name} created successfully at ${join(outputPath, name)}`);
  }

  private static getTemplate(category: PluginCategory): string {
    switch (category) {
      case PluginCategory.BACKEND:
        return PluginTemplates.backendTemplate;
      case PluginCategory.RAG:
        return PluginTemplates.ragTemplate;
      default:
        return PluginTemplates.backendTemplate; // Default to backend
    }
  }

  private static toPascalCase(str: string): string {
    return str.replace(/[-_](.)/g, (_, char) => char.toUpperCase())
      .replace(/^./, char => char.toUpperCase());
  }

  private static generateReadme(name: string, category: PluginCategory): string {
    return `# Claudette ${this.toPascalCase(name)} Plugin

A ${category} plugin for Claudette AI middleware.

## Installation

\`\`\`bash
npm install claudette-plugin-${name}
\`\`\`

## Usage

\`\`\`typescript
import { pluginManager } from 'claudette';
import { ${this.toPascalCase(name)}Plugin } from 'claudette-plugin-${name}';

// Register the plugin
const plugin = new ${this.toPascalCase(name)}Plugin();
await pluginManager.registerPlugin(plugin, {
  enabled: true,
  settings: {
    // Plugin-specific settings
  }
});
\`\`\`

## Configuration

### Settings

- \`enabled\`: Enable/disable the plugin
- \`priority\`: Plugin execution priority

## Development

\`\`\`bash
# Install dependencies
npm install

# Build plugin
npm run build

# Run tests
npm test

# Development mode
npm run dev
\`\`\`

## License

MIT
`;
  }

  private static getTestTemplate(category: PluginCategory, name: string, typescript: boolean): string {
    const extension = typescript ? 'ts' : 'js';
    const importStatement = typescript 
      ? `import { ${this.toPascalCase(name)}Plugin } from '../src/index';`
      : `const { ${this.toPascalCase(name)}Plugin } = require('../src/index');`;

    return `${importStatement}

describe('${this.toPascalCase(name)}Plugin', () => {
  let plugin${typescript ? ': ' + this.toPascalCase(name) + 'Plugin' : ''};

  beforeEach(() => {
    plugin = new ${this.toPascalCase(name)}Plugin();
  });

  test('should initialize correctly', async () => {
    const mockContext = {
      logger: { info: jest.fn(), error: jest.fn() },
      config: { enabled: true },
      events: { emit: jest.fn() },
      claudetteVersion: '2.0.0',
      environment: 'test'
    };

    await plugin.initialize(mockContext);
    expect(plugin.isInitialized).toBe(true);
  });

  test('should validate configuration', async () => {
    const config = { enabled: true, settings: {} };
    const isValid = await plugin.validateConfig(config);
    expect(isValid).toBe(true);
  });

  ${category === PluginCategory.BACKEND ? `
  test('should check availability', async () => {
    const isAvailable = await plugin.isAvailable();
    expect(typeof isAvailable).toBe('boolean');
  });

  test('should estimate costs', () => {
    const cost = plugin.estimateCost(1000);
    expect(typeof cost).toBe('number');
    expect(cost).toBeGreaterThanOrEqual(0);
  });
  ` : ''}

  test('should cleanup properly', async () => {
    const mockContext = {
      logger: { info: jest.fn(), error: jest.fn() },
      config: { enabled: true },
      events: { emit: jest.fn() },
      claudetteVersion: '2.0.0',
      environment: 'test'
    };

    await plugin.initialize(mockContext);
    await plugin.cleanup();
    expect(plugin.isInitialized).toBe(false);
  });
});
`;
  }
}



// Type definitions for dev tools
export interface PluginScaffoldOptions {
  name: string;
  category: PluginCategory;
  outputPath: string;
  typescript?: boolean;
  includeTests?: boolean;
  includeDocs?: boolean;
  author?: string;
  license?: string;
}

export interface DevServerOptions {
  hotReload?: boolean;
  mockBackends?: MockBackendConfig[];
  debugMode?: boolean;
  port?: number;
}

export interface MockBackendConfig {
  name: string;
  type: string;
  responses?: Record<string, any>;
  latency?: number;
  errorRate?: number;
}

