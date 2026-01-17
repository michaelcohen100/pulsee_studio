/**
 * GENERATION QUEUE SYSTEM
 * Gère les générations de manière séquentielle pour éviter la surcharge API
 * Avec retry intelligent, annulation, et reporting de progression
 */

export type QueueItemStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface QueueItem {
  id: string;
  status: QueueItemStatus;
  prompt: string;
  attempt: number;
  maxAttempts: number;
  result?: string; // URL de l'image générée
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface QueueProgress {
  total: number;
  completed: number;
  failed: number;
  currentItem: QueueItem | null;
  items: QueueItem[];
  isRunning: boolean;
  consecutiveFailures: number;
}

export interface QueueConfig {
  maxConsecutiveFailures: number; // Arrêt automatique après N échecs consécutifs
  delayBetweenItems: number; // Pause entre chaque génération (ms)
  maxRetries: number; // Nombre de retry par item
  onProgress: (progress: QueueProgress) => void;
  onItemComplete: (item: QueueItem) => void;
  onQueueComplete: (results: QueueItem[]) => void;
  onError: (error: string) => void;
}

export class GenerationQueue {
  private queue: QueueItem[] = [];
  private isRunning: boolean = false;
  private isCancelled: boolean = false;
  private consecutiveFailures: number = 0;
  private config: QueueConfig;
  private generateFn: (prompt: string) => Promise<string>;

  constructor(
    generateFn: (prompt: string) => Promise<string>,
    config: Partial<QueueConfig> = {}
  ) {
    this.generateFn = generateFn;
    this.config = {
      maxConsecutiveFailures: 3,
      delayBetweenItems: 2000, // 2 secondes entre chaque génération
      maxRetries: 2,
      onProgress: () => {},
      onItemComplete: () => {},
      onQueueComplete: () => {},
      onError: () => {},
      ...config
    };
  }

  /**
   * Ajoute des items à la queue
   */
  addItems(prompts: string[]): void {
    const newItems: QueueItem[] = prompts.map((prompt, index) => ({
      id: `gen_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
      status: 'pending',
      prompt,
      attempt: 0,
      maxAttempts: this.config.maxRetries + 1
    }));
    
    this.queue.push(...newItems);
    this.reportProgress();
  }

  /**
   * Démarre le traitement de la queue
   */
  async start(): Promise<QueueItem[]> {
    if (this.isRunning) {
      console.warn('Queue already running');
      return this.queue;
    }

    this.isRunning = true;
    this.isCancelled = false;
    this.consecutiveFailures = 0;

    for (let i = 0; i < this.queue.length; i++) {
      // Vérifier annulation
      if (this.isCancelled) {
        this.markRemainingAsCancelled(i);
        break;
      }

      // Vérifier limite d'échecs consécutifs
      if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
        this.config.onError(
          `Arrêt automatique : ${this.consecutiveFailures} échecs consécutifs. ` +
          `L'API semble saturée ou le prompt pose problème.`
        );
        this.markRemainingAsCancelled(i);
        break;
      }

      const item = this.queue[i];
      await this.processItem(item);

      // Pause entre les générations (sauf pour le dernier)
      if (i < this.queue.length - 1 && !this.isCancelled) {
        await this.delay(this.config.delayBetweenItems);
      }
    }

    this.isRunning = false;
    this.config.onQueueComplete(this.queue);
    return this.queue;
  }

  /**
   * Annule la queue en cours
   */
  cancel(): void {
    this.isCancelled = true;
  }

  /**
   * Réinitialise la queue
   */
  reset(): void {
    this.queue = [];
    this.isRunning = false;
    this.isCancelled = false;
    this.consecutiveFailures = 0;
  }

  /**
   * Retourne l'état actuel
   */
  getProgress(): QueueProgress {
    const completed = this.queue.filter(i => i.status === 'completed').length;
    const failed = this.queue.filter(i => i.status === 'failed').length;
    const currentItem = this.queue.find(i => i.status === 'processing') || null;

    return {
      total: this.queue.length,
      completed,
      failed,
      currentItem,
      items: [...this.queue],
      isRunning: this.isRunning,
      consecutiveFailures: this.consecutiveFailures
    };
  }

  // === PRIVATE METHODS ===

  private async processItem(item: QueueItem): Promise<void> {
    item.status = 'processing';
    item.startedAt = Date.now();
    item.attempt++;
    
    this.reportProgress();

    try {
      const result = await this.generateFn(item.prompt);
      
      item.status = 'completed';
      item.result = result;
      item.completedAt = Date.now();
      this.consecutiveFailures = 0; // Reset on success
      
      this.config.onItemComplete(item);
      
    } catch (error: any) {
      const errorMessage = error?.message || 'Erreur inconnue';
      
      // Vérifier si on peut retry
      if (item.attempt < item.maxAttempts) {
        console.warn(`Item ${item.id} failed (attempt ${item.attempt}/${item.maxAttempts}), retrying...`);
        
        // Attendre avant retry (backoff exponentiel)
        await this.delay(Math.pow(2, item.attempt) * 1000);
        
        // Retry récursif
        await this.processItem(item);
        return;
      }
      
      // Échec définitif
      item.status = 'failed';
      item.error = errorMessage;
      item.completedAt = Date.now();
      this.consecutiveFailures++;
      
      this.config.onItemComplete(item);
    }

    this.reportProgress();
  }

  private markRemainingAsCancelled(fromIndex: number): void {
    for (let i = fromIndex; i < this.queue.length; i++) {
      if (this.queue[i].status === 'pending') {
        this.queue[i].status = 'cancelled';
      }
    }
    this.reportProgress();
  }

  private reportProgress(): void {
    this.config.onProgress(this.getProgress());
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * CACHE SYSTEM pour les descriptions générées
 * Évite de recalculer les mêmes descriptions
 */
export class DescriptionCache {
  private cache: Map<string, { description: string; timestamp: number }> = new Map();
  private maxAge: number = 24 * 60 * 60 * 1000; // 24 heures

  /**
   * Génère une clé unique basée sur les images
   */
  private generateKey(images: string[]): string {
    // Utilise un hash simple des premiers caractères de chaque image
    const signature = images
      .slice(0, 3) // Max 3 images pour la clé
      .map(img => img.substring(0, 100)) // Premiers 100 chars
      .join('|');
    
    // Simple hash
    let hash = 0;
    for (let i = 0; i < signature.length; i++) {
      const char = signature.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `desc_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Récupère une description du cache
   */
  get(images: string[]): string | null {
    const key = this.generateKey(images);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Vérifier expiration
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.description;
  }

  /**
   * Stocke une description dans le cache
   */
  set(images: string[], description: string): void {
    const key = this.generateKey(images);
    this.cache.set(key, {
      description,
      timestamp: Date.now()
    });
    
    // Nettoyage si trop d'entrées
    if (this.cache.size > 50) {
      this.cleanup();
    }
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Vide tout le cache
   */
  clear(): void {
    this.cache.clear();
  }
}

// Instance globale du cache
export const descriptionCache = new DescriptionCache();
