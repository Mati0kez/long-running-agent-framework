/**
 * Feature Manager
 * Manages the comprehensive feature list that guides long-running agents
 *
 * Key insight from Anthropic article:
 * "We prompted the initializer agent to write a comprehensive file of feature
 * requirements expanding on the user's initial prompt... These features were all
 * initially marked as 'failing' so that later coding agents would have a clear
 * outline of what full functionality looked like."
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Feature {
  id: string;
  category: FeatureCategory;
  description: string;
  steps: string[];
  passes: boolean;
  priority: number;
  dependencies?: string[];
  verificationNotes?: string;
  lastAttemptedAt?: Date;
  completedAt?: Date;
}

export type FeatureCategory =
  | 'functional'
  | 'ui'
  | 'ux'
  | 'performance'
  | 'security'
  | 'accessibility'
  | 'integration'
  | 'error-handling';

export interface FeatureList {
  projectName: string;
  createdAt: Date;
  updatedAt: Date;
  totalFeatures: number;
  completedFeatures: number;
  features: Feature[];
}

export class FeatureManager {
  private projectRoot: string;
  private featureListPath: string;
  private featureList: FeatureList | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.featureListPath = path.join(projectRoot, 'feature_list.json');
  }

  /**
   * Generate a comprehensive feature list from a project specification
   * This expands a high-level spec into granular, testable features
   */
  async generateFeatureList(spec: ProjectSpecification): Promise<Feature[]> {
    const features: Feature[] = [];
    let featureId = 1;

    // Expand each spec feature into multiple granular features
    for (const specFeature of spec.features) {
      const expandedFeatures = this.expandFeature(specFeature, featureId, spec);
      features.push(...expandedFeatures);
      featureId += expandedFeatures.length;
    }

    // Add common infrastructure features
    const infrastructureFeatures = this.generateInfrastructureFeatures(spec, featureId);
    features.push(...infrastructureFeatures);

    // Sort by priority
    features.sort((a, b) => a.priority - b.priority);

    return features;
  }

  /**
   * Expand a single spec feature into multiple granular, testable features
   */
  private expandFeature(
    specFeature: SpecFeature,
    startId: number,
    spec: ProjectSpecification
  ): Feature[] {
    const features: Feature[] = [];

    // Example expansion for a "user can send a message" feature
    // This should be customized based on the project type

    const baseFeature: Feature = {
      id: `F${String(startId).padStart(3, '0')}`,
      category: specFeature.category,
      description: specFeature.description,
      steps: specFeature.steps || this.generateDefaultSteps(specFeature),
      passes: false,
      priority: this.calculatePriority(specFeature.priority)
    };

    features.push(baseFeature);

    // Add related features (error handling, edge cases, etc.)
    if (specFeature.includeErrorHandling !== false) {
      features.push({
        id: `F${String(startId + 1).padStart(3, '0')}`,
        category: 'error-handling',
        description: `Error handling for: ${specFeature.description}`,
        steps: [
          `Trigger error condition for ${specFeature.name}`,
          'Verify appropriate error message is displayed',
          'Verify system remains in stable state',
          'Verify user can recover from error'
        ],
        passes: false,
        priority: this.calculatePriority(specFeature.priority) + 10,
        dependencies: [baseFeature.id]
      });
    }

    return features;
  }

  /**
   * Generate default test steps for a feature
   */
  private generateDefaultSteps(feature: SpecFeature): string[] {
    const steps: string[] = [];

    // Parse the feature description to generate meaningful steps
    if (feature.description.includes('user can')) {
      steps.push('Navigate to the relevant interface');
      steps.push('Perform the user action described');
      steps.push('Verify the expected result occurs');
      steps.push('Verify no errors are thrown');
      steps.push('Verify the UI updates appropriately');
    } else {
      steps.push(`Set up test environment for: ${feature.description}`);
      steps.push('Execute the functionality');
      steps.push('Verify expected outcome');
      steps.push('Verify no regressions');
    }

    return steps;
  }

  /**
   * Generate infrastructure features common to most projects
   */
  private generateInfrastructureFeatures(
    spec: ProjectSpecification,
    startId: number
  ): Feature[] {
    const features: Feature[] = [];
    let id = startId;

    // Development environment
    features.push({
      id: `I${String(id++).padStart(3, '0')}`,
      category: 'functional',
      description: 'Development server starts successfully',
      steps: [
        'Run init.sh or npm run dev',
        'Verify server starts without errors',
        'Verify app is accessible at expected URL',
        'Verify hot reload works'
      ],
      passes: false,
      priority: 1
    });

    // Basic build
    features.push({
      id: `I${String(id++).padStart(3, '0')}`,
      category: 'functional',
      description: 'Production build completes successfully',
      steps: [
        'Run build command',
        'Verify no build errors',
        'Verify output files are generated',
        'Verify build size is reasonable'
      ],
      passes: false,
      priority: 1
    });

    // TypeScript/types (if applicable)
    if (spec.techStack?.includes('typescript')) {
      features.push({
        id: `I${String(id++).padStart(3, '0')}`,
        category: 'functional',
        description: 'TypeScript compilation passes without errors',
        steps: [
          'Run tsc --noEmit',
          'Verify no type errors',
          'Verify no implicit any warnings'
        ],
        passes: false,
        priority: 1
      });
    }

    // Linting
    features.push({
      id: `I${String(id++).padStart(3, '0')}`,
      category: 'functional',
      description: 'Linting passes without errors',
      steps: [
        'Run linter (eslint/prettier)',
        'Verify no lint errors',
        'Verify code style is consistent'
      ],
      passes: false,
      priority: 2
    });

    return features;
  }

  /**
   * Calculate numeric priority from priority level
   */
  private calculatePriority(level: 'high' | 'medium' | 'low'): number {
    switch (level) {
      case 'high': return 10;
      case 'medium': return 50;
      case 'low': return 100;
      default: return 50;
    }
  }

  /**
   * Save feature list to JSON file
   * Using JSON to prevent inappropriate edits (as recommended in article)
   */
  async saveFeatureList(features: Feature[]): Promise<void> {
    const featureList: FeatureList = {
      projectName: path.basename(this.projectRoot),
      createdAt: new Date(),
      updatedAt: new Date(),
      totalFeatures: features.length,
      completedFeatures: features.filter(f => f.passes).length,
      features
    };

    await fs.promises.writeFile(
      this.featureListPath,
      JSON.stringify(featureList, null, 2),
      'utf-8'
    );

    this.featureList = featureList;
  }

  /**
   * Load feature list from JSON file
   */
  async loadFeatureList(): Promise<FeatureList> {
    if (this.featureList) {
      return this.featureList;
    }

    const content = await fs.promises.readFile(this.featureListPath, 'utf-8');
    this.featureList = JSON.parse(content);
    return this.featureList!;
  }

  /**
   * Get the next incomplete feature to work on
   * Returns highest priority incomplete feature
   */
  async getNextIncompleteFeature(): Promise<Feature | null> {
    const list = await this.loadFeatureList();

    const incompleteFeatures = list.features
      .filter(f => !f.passes)
      .sort((a, b) => a.priority - b.priority);

    if (incompleteFeatures.length === 0) {
      return null;
    }

    // Check dependencies
    for (const feature of incompleteFeatures) {
      if (await this.areDependenciesMet(feature)) {
        return feature;
      }
    }

    // Return first incomplete if no dependencies are met
    return incompleteFeatures[0];
  }

  /**
   * Check if all dependencies for a feature are met
   */
  private async areDependenciesMet(feature: Feature): Promise<boolean> {
    if (!feature.dependencies || feature.dependencies.length === 0) {
      return true;
    }

    const list = await this.loadFeatureList();

    for (const depId of feature.dependencies) {
      const depFeature = list.features.find(f => f.id === depId);
      if (!depFeature || !depFeature.passes) {
        return false;
      }
    }

    return true;
  }

  /**
   * Mark a feature as complete after verification
   */
  async markFeatureComplete(
    featureId: string,
    verificationSteps: VerificationStep[]
  ): Promise<void> {
    const list = await this.loadFeatureList();
    const feature = list.features.find(f => f.id === featureId);

    if (!feature) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    // Verify all steps passed
    const allStepsPassed = verificationSteps.every(s => s.passed);
    if (!allStepsPassed) {
      throw new Error('Cannot mark feature as complete: not all verification steps passed');
    }

    feature.passes = true;
    feature.completedAt = new Date();
    feature.verificationNotes = verificationSteps
      .map(s => `${s.step}: ${s.passed ? 'PASS' : 'FAIL'}`)
      .join('\n');

    list.completedFeatures = list.features.filter(f => f.passes).length;
    list.updatedAt = new Date();

    await this.saveFeatureList(list.features);
  }

  /**
   * Get count of incomplete features
   */
  async getIncompleteFeatureCount(): Promise<number> {
    const list = await this.loadFeatureList();
    return list.features.filter(f => !f.passes).length;
  }

  /**
   * Get feature by ID
   */
  async getFeature(featureId: string): Promise<Feature | null> {
    const list = await this.loadFeatureList();
    return list.features.find(f => f.id === featureId) || null;
  }

  /**
   * Get all features in a category
   */
  async getFeaturesByCategory(category: FeatureCategory): Promise<Feature[]> {
    const list = await this.loadFeatureList();
    return list.features.filter(f => f.category === category);
  }

  /**
   * Get progress summary
   */
  async getProgressSummary(): Promise<FeatureProgressSummary> {
    const list = await this.loadFeatureList();

    const byCategory: Record<FeatureCategory, { total: number; completed: number }> = {} as any;

    for (const feature of list.features) {
      if (!byCategory[feature.category]) {
        byCategory[feature.category] = { total: 0, completed: 0 };
      }
      byCategory[feature.category].total++;
      if (feature.passes) {
        byCategory[feature.category].completed++;
      }
    }

    return {
      total: list.totalFeatures,
      completed: list.completedFeatures,
      remaining: list.totalFeatures - list.completedFeatures,
      percentage: Math.round((list.completedFeatures / list.totalFeatures) * 100),
      byCategory
    };
  }
}

// Type definitions
interface ProjectSpecification {
  name: string;
  description: string;
  type: string;
  features: SpecFeature[];
  techStack: string[];
}

interface SpecFeature {
  name: string;
  description: string;
  category: FeatureCategory;
  priority: 'high' | 'medium' | 'low';
  steps?: string[];
  includeErrorHandling?: boolean;
}

interface VerificationStep {
  step: string;
  passed: boolean;
  evidence?: string;
}

interface FeatureProgressSummary {
  total: number;
  completed: number;
  remaining: number;
  percentage: number;
  byCategory: Record<FeatureCategory, { total: number; completed: number }>;
}
