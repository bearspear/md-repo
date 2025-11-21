import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PluginCommand {
  id: string;
  name: string;
  description: string;
  icon: string;
  shortcut?: string;
  action: () => void;
}

export interface PluginToolbarButton {
  id: string;
  tooltip: string;
  icon: string;
  action: () => void;
}

export interface PluginMarkdownExtension {
  name: string;
  // Function to transform markdown before rendering
  transform?: (markdown: string) => string;
  // Function to transform HTML after rendering
  postProcess?: (html: string) => string;
}

export interface PluginExporter {
  id: string;
  name: string;
  icon: string;
  extension: string;
  export: (markdown: string, title: string) => Promise<Blob>;
}

export interface PluginHook {
  // Called when content changes
  onContentChange?: (content: string) => void;
  // Called before save
  onBeforeSave?: (content: string) => string;
  // Called after save
  onAfterSave?: (content: string) => void;
  // Called on document load
  onLoad?: (content: string) => void;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  enabled: boolean;

  // Plugin components
  commands?: PluginCommand[];
  toolbarButtons?: PluginToolbarButton[];
  markdownExtensions?: PluginMarkdownExtension[];
  exporters?: PluginExporter[];
  hooks?: PluginHook;

  // Lifecycle methods
  onEnable?: () => void;
  onDisable?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class PluginService {
  private plugins: Map<string, Plugin> = new Map();
  private pluginsSubject = new BehaviorSubject<Plugin[]>([]);

  plugins$ = this.pluginsSubject.asObservable();

  constructor() {
    // Load enabled plugins from localStorage
    this.loadPluginStates();
  }

  /**
   * Register a new plugin
   */
  registerPlugin(plugin: Plugin): boolean {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} is already registered`);
      return false;
    }

    // Check for saved enabled state
    const savedState = localStorage.getItem(`plugin-${plugin.id}-enabled`);
    if (savedState !== null) {
      plugin.enabled = savedState === 'true';
    }

    this.plugins.set(plugin.id, plugin);

    if (plugin.enabled && plugin.onEnable) {
      plugin.onEnable();
    }

    this.updatePluginsList();
    console.log(`Plugin registered: ${plugin.name} v${plugin.version}`);
    return true;
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    if (plugin.enabled && plugin.onDisable) {
      plugin.onDisable();
    }

    this.plugins.delete(pluginId);
    this.updatePluginsList();
    return true;
  }

  /**
   * Enable a plugin
   */
  enablePlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.enabled) {
      return false;
    }

    plugin.enabled = true;
    localStorage.setItem(`plugin-${pluginId}-enabled`, 'true');

    if (plugin.onEnable) {
      plugin.onEnable();
    }

    this.updatePluginsList();
    return true;
  }

  /**
   * Disable a plugin
   */
  disablePlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.enabled) {
      return false;
    }

    plugin.enabled = false;
    localStorage.setItem(`plugin-${pluginId}-enabled`, 'false');

    if (plugin.onDisable) {
      plugin.onDisable();
    }

    this.updatePluginsList();
    return true;
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get enabled plugins only
   */
  getEnabledPlugins(): Plugin[] {
    return this.getPlugins().filter(p => p.enabled);
  }

  /**
   * Get a specific plugin
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all commands from enabled plugins
   */
  getCommands(): PluginCommand[] {
    return this.getEnabledPlugins()
      .flatMap(p => p.commands || []);
  }

  /**
   * Get all toolbar buttons from enabled plugins
   */
  getToolbarButtons(): PluginToolbarButton[] {
    return this.getEnabledPlugins()
      .flatMap(p => p.toolbarButtons || []);
  }

  /**
   * Get all exporters from enabled plugins
   */
  getExporters(): PluginExporter[] {
    return this.getEnabledPlugins()
      .flatMap(p => p.exporters || []);
  }

  /**
   * Apply markdown transformations from all enabled plugins
   */
  transformMarkdown(markdown: string): string {
    let result = markdown;

    for (const plugin of this.getEnabledPlugins()) {
      for (const ext of plugin.markdownExtensions || []) {
        if (ext.transform) {
          result = ext.transform(result);
        }
      }
    }

    return result;
  }

  /**
   * Apply HTML post-processing from all enabled plugins
   */
  postProcessHtml(html: string): string {
    let result = html;

    for (const plugin of this.getEnabledPlugins()) {
      for (const ext of plugin.markdownExtensions || []) {
        if (ext.postProcess) {
          result = ext.postProcess(result);
        }
      }
    }

    return result;
  }

  /**
   * Call onContentChange hooks
   */
  triggerContentChange(content: string): void {
    for (const plugin of this.getEnabledPlugins()) {
      if (plugin.hooks?.onContentChange) {
        try {
          plugin.hooks.onContentChange(content);
        } catch (e) {
          console.error(`Plugin ${plugin.id} hook error:`, e);
        }
      }
    }
  }

  /**
   * Call onBeforeSave hooks
   */
  triggerBeforeSave(content: string): string {
    let result = content;

    for (const plugin of this.getEnabledPlugins()) {
      if (plugin.hooks?.onBeforeSave) {
        try {
          result = plugin.hooks.onBeforeSave(result);
        } catch (e) {
          console.error(`Plugin ${plugin.id} hook error:`, e);
        }
      }
    }

    return result;
  }

  /**
   * Call onAfterSave hooks
   */
  triggerAfterSave(content: string): void {
    for (const plugin of this.getEnabledPlugins()) {
      if (plugin.hooks?.onAfterSave) {
        try {
          plugin.hooks.onAfterSave(content);
        } catch (e) {
          console.error(`Plugin ${plugin.id} hook error:`, e);
        }
      }
    }
  }

  /**
   * Call onLoad hooks
   */
  triggerLoad(content: string): void {
    for (const plugin of this.getEnabledPlugins()) {
      if (plugin.hooks?.onLoad) {
        try {
          plugin.hooks.onLoad(content);
        } catch (e) {
          console.error(`Plugin ${plugin.id} hook error:`, e);
        }
      }
    }
  }

  private updatePluginsList(): void {
    this.pluginsSubject.next(this.getPlugins());
  }

  private loadPluginStates(): void {
    // Plugin states are loaded when each plugin is registered
  }
}

// Example built-in plugins

/**
 * Word frequency analyzer plugin
 */
export const wordFrequencyPlugin: Plugin = {
  id: 'word-frequency',
  name: 'Word Frequency Analyzer',
  version: '1.0.0',
  description: 'Analyzes word frequency in your document',
  author: 'Markdown Studio',
  enabled: false,
  commands: [
    {
      id: 'analyze-frequency',
      name: 'Analyze Word Frequency',
      description: 'Show word frequency analysis',
      icon: 'analytics',
      action: () => {
        // Implementation would go here
        console.log('Word frequency analysis');
      }
    }
  ]
};

/**
 * Reading level analyzer plugin
 */
export const readingLevelPlugin: Plugin = {
  id: 'reading-level',
  name: 'Reading Level Analyzer',
  version: '1.0.0',
  description: 'Analyzes the reading level of your document',
  author: 'Markdown Studio',
  enabled: false,
  commands: [
    {
      id: 'analyze-reading-level',
      name: 'Analyze Reading Level',
      description: 'Calculate Flesch-Kincaid reading level',
      icon: 'school',
      action: () => {
        console.log('Reading level analysis');
      }
    }
  ]
};

/**
 * Auto-save to cloud plugin
 */
export const cloudSyncPlugin: Plugin = {
  id: 'cloud-sync',
  name: 'Cloud Sync',
  version: '1.0.0',
  description: 'Sync your documents to cloud storage',
  author: 'Markdown Studio',
  enabled: false,
  hooks: {
    onAfterSave: (content) => {
      // Would sync to cloud here
      console.log('Syncing to cloud...');
    }
  }
};
