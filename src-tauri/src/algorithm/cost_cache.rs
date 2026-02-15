// ============================================================================
// 代价值缓存模块
// ============================================================================
//
// 本模块实现代价值的缓存机制，用于提高排课算法的性能。
//
// 主要功能：
// 1. 缓存已计算的代价值，避免重复计算
// 2. 支持增量更新代价值
// 3. 提供缓存统计信息
//
// 设计思路：
// - 使用 HashMap 存储课表哈希值到代价值的映射
// - 使用 LRU 策略限制缓存大小
// - 记录缓存命中率等统计信息
//
// ============================================================================

use std::collections::HashMap;
use tracing::{debug, info, trace};

/// 代价值缓存
///
/// 用于缓存已计算的课表代价值，避免重复计算。
///
/// # 示例
///
/// ```
/// use course_scheduling::algorithm::cost_cache::CostCache;
///
/// let mut cache = CostCache::new(1000);
///
/// // 计算并缓存代价值
/// let schedule_hash = 12345u64;
/// let cost = 100u32;
/// cache.insert(schedule_hash, cost);
///
/// // 查询缓存
/// if let Some(cached_cost) = cache.get(schedule_hash) {
///     println!("缓存命中，代价值: {}", cached_cost);
/// }
///
/// // 查看统计信息
/// let stats = cache.get_stats();
/// println!("缓存命中率: {:.2}%", stats.hit_rate() * 100.0);
/// ```
#[derive(Debug)]
pub struct CostCache {
    /// 缓存存储：课表哈希值 -> 代价值
    cache: HashMap<u64, u32>,
    /// 最大缓存容量
    max_capacity: usize,
    /// 缓存命中次数
    hits: u64,
    /// 缓存未命中次数
    misses: u64,
    /// 缓存插入次数
    inserts: u64,
    /// 缓存淘汰次数
    evictions: u64,
}

impl CostCache {
    /// 创建新的代价值缓存
    ///
    /// # 参数
    /// - `max_capacity`: 最大缓存容量（条目数）
    ///
    /// # 返回
    /// 新的代价值缓存实例
    ///
    /// # 示例
    ///
    /// ```
    /// use course_scheduling::algorithm::cost_cache::CostCache;
    ///
    /// let cache = CostCache::new(1000);
    /// ```
    pub fn new(max_capacity: usize) -> Self {
        info!("创建代价值缓存，最大容量: {}", max_capacity);
        Self {
            cache: HashMap::with_capacity(max_capacity),
            max_capacity,
            hits: 0,
            misses: 0,
            inserts: 0,
            evictions: 0,
        }
    }

    /// 查询缓存的代价值
    ///
    /// # 参数
    /// - `schedule_hash`: 课表的哈希值
    ///
    /// # 返回
    /// 如果缓存命中，返回 Some(代价值)；否则返回 None
    ///
    /// # 示例
    ///
    /// ```
    /// use course_scheduling::algorithm::cost_cache::CostCache;
    ///
    /// let mut cache = CostCache::new(1000);
    /// cache.insert(12345, 100);
    ///
    /// assert_eq!(cache.get(12345), Some(100));
    /// assert_eq!(cache.get(99999), None);
    /// ```
    pub fn get(&mut self, schedule_hash: u64) -> Option<u32> {
        if let Some(&cost) = self.cache.get(&schedule_hash) {
            self.hits += 1;
            trace!("缓存命中: hash={}, cost={}", schedule_hash, cost);
            Some(cost)
        } else {
            self.misses += 1;
            trace!("缓存未命中: hash={}", schedule_hash);
            None
        }
    }

    /// 插入代价值到缓存
    ///
    /// 如果缓存已满，会淘汰一个条目（简单的随机淘汰策略）。
    ///
    /// # 参数
    /// - `schedule_hash`: 课表的哈希值
    /// - `cost`: 代价值
    ///
    /// # 示例
    ///
    /// ```
    /// use course_scheduling::algorithm::cost_cache::CostCache;
    ///
    /// let mut cache = CostCache::new(1000);
    /// cache.insert(12345, 100);
    /// ```
    pub fn insert(&mut self, schedule_hash: u64, cost: u32) {
        // 如果缓存已满，淘汰一个条目
        if self.cache.len() >= self.max_capacity && !self.cache.contains_key(&schedule_hash) {
            self.evict_one();
        }

        self.cache.insert(schedule_hash, cost);
        self.inserts += 1;
        trace!("插入缓存: hash={}, cost={}", schedule_hash, cost);
    }

    /// 淘汰一个缓存条目
    ///
    /// 使用简单的随机淘汰策略。在实际应用中，可以考虑使用 LRU 等更复杂的策略。
    fn evict_one(&mut self) {
        if let Some(&key) = self.cache.keys().next() {
            self.cache.remove(&key);
            self.evictions += 1;
            trace!("淘汰缓存条目: hash={}", key);
        }
    }

    /// 清空缓存
    ///
    /// # 示例
    ///
    /// ```
    /// use course_scheduling::algorithm::cost_cache::CostCache;
    ///
    /// let mut cache = CostCache::new(1000);
    /// cache.insert(12345, 100);
    /// cache.clear();
    ///
    /// assert_eq!(cache.get(12345), None);
    /// ```
    pub fn clear(&mut self) {
        let size = self.cache.len();
        self.cache.clear();
        info!("清空缓存，清除了 {} 个条目", size);
    }

    /// 获取缓存统计信息
    ///
    /// # 返回
    /// 缓存统计信息
    ///
    /// # 示例
    ///
    /// ```
    /// use course_scheduling::algorithm::cost_cache::CostCache;
    ///
    /// let mut cache = CostCache::new(1000);
    /// cache.insert(12345, 100);
    /// cache.get(12345);
    /// cache.get(99999);
    ///
    /// let stats = cache.get_stats();
    /// assert_eq!(stats.hits, 1);
    /// assert_eq!(stats.misses, 1);
    /// ```
    pub fn get_stats(&self) -> CacheStats {
        CacheStats {
            size: self.cache.len(),
            capacity: self.max_capacity,
            hits: self.hits,
            misses: self.misses,
            inserts: self.inserts,
            evictions: self.evictions,
        }
    }

    /// 重置统计信息
    ///
    /// 清除命中、未命中等计数器，但保留缓存内容。
    ///
    /// # 示例
    ///
    /// ```
    /// use course_scheduling::algorithm::cost_cache::CostCache;
    ///
    /// let mut cache = CostCache::new(1000);
    /// cache.insert(12345, 100);
    /// cache.get(12345);
    ///
    /// cache.reset_stats();
    ///
    /// let stats = cache.get_stats();
    /// assert_eq!(stats.hits, 0);
    /// assert_eq!(stats.misses, 0);
    /// ```
    pub fn reset_stats(&mut self) {
        self.hits = 0;
        self.misses = 0;
        self.inserts = 0;
        self.evictions = 0;
        debug!("重置缓存统计信息");
    }
}

/// 缓存统计信息
///
/// 包含缓存的各项统计指标。
#[derive(Debug, Clone, Copy)]
pub struct CacheStats {
    /// 当前缓存大小（条目数）
    pub size: usize,
    /// 最大缓存容量
    pub capacity: usize,
    /// 缓存命中次数
    pub hits: u64,
    /// 缓存未命中次数
    pub misses: u64,
    /// 缓存插入次数
    pub inserts: u64,
    /// 缓存淘汰次数
    pub evictions: u64,
}

impl CacheStats {
    /// 计算缓存命中率
    ///
    /// # 返回
    /// 命中率（0.0 到 1.0 之间）
    ///
    /// # 示例
    ///
    /// ```
    /// use course_scheduling::algorithm::cost_cache::{CostCache, CacheStats};
    ///
    /// let stats = CacheStats {
    ///     size: 10,
    ///     capacity: 100,
    ///     hits: 80,
    ///     misses: 20,
    ///     inserts: 20,
    ///     evictions: 0,
    /// };
    ///
    /// assert_eq!(stats.hit_rate(), 0.8);
    /// ```
    pub fn hit_rate(&self) -> f64 {
        let total = self.hits + self.misses;
        if total == 0 {
            0.0
        } else {
            self.hits as f64 / total as f64
        }
    }

    /// 计算缓存使用率
    ///
    /// # 返回
    /// 使用率（0.0 到 1.0 之间）
    ///
    /// # 示例
    ///
    /// ```
    /// use course_scheduling::algorithm::cost_cache::{CostCache, CacheStats};
    ///
    /// let stats = CacheStats {
    ///     size: 50,
    ///     capacity: 100,
    ///     hits: 0,
    ///     misses: 0,
    ///     inserts: 0,
    ///     evictions: 0,
    /// };
    ///
    /// assert_eq!(stats.usage_rate(), 0.5);
    /// ```
    pub fn usage_rate(&self) -> f64 {
        if self.capacity == 0 {
            0.0
        } else {
            self.size as f64 / self.capacity as f64
        }
    }
}

// ============================================================================
// 单元测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_new() {
        let cache = CostCache::new(100);
        assert_eq!(cache.max_capacity, 100);
        assert_eq!(cache.cache.len(), 0);
        assert_eq!(cache.hits, 0);
        assert_eq!(cache.misses, 0);
    }

    #[test]
    fn test_cache_insert_and_get() {
        let mut cache = CostCache::new(100);

        // 插入并查询
        cache.insert(12345, 100);
        assert_eq!(cache.get(12345), Some(100));

        // 查询不存在的条目
        assert_eq!(cache.get(99999), None);
    }

    #[test]
    fn test_cache_hit_miss_stats() {
        let mut cache = CostCache::new(100);

        cache.insert(12345, 100);

        // 命中
        cache.get(12345);
        assert_eq!(cache.hits, 1);
        assert_eq!(cache.misses, 0);

        // 未命中
        cache.get(99999);
        assert_eq!(cache.hits, 1);
        assert_eq!(cache.misses, 1);
    }

    #[test]
    fn test_cache_eviction() {
        let mut cache = CostCache::new(2);

        // 插入3个条目，应该触发淘汰
        cache.insert(1, 10);
        cache.insert(2, 20);
        cache.insert(3, 30);

        // 缓存大小应该不超过容量
        assert!(cache.cache.len() <= 2);
        assert_eq!(cache.evictions, 1);
    }

    #[test]
    fn test_cache_clear() {
        let mut cache = CostCache::new(100);

        cache.insert(1, 10);
        cache.insert(2, 20);
        cache.insert(3, 30);

        cache.clear();

        assert_eq!(cache.cache.len(), 0);
        assert_eq!(cache.get(1), None);
        assert_eq!(cache.get(2), None);
        assert_eq!(cache.get(3), None);
    }

    #[test]
    fn test_cache_stats() {
        let mut cache = CostCache::new(100);

        cache.insert(1, 10);
        cache.insert(2, 20);

        cache.get(1); // 命中
        cache.get(3); // 未命中

        let stats = cache.get_stats();
        assert_eq!(stats.size, 2);
        assert_eq!(stats.capacity, 100);
        assert_eq!(stats.hits, 1);
        assert_eq!(stats.misses, 1);
        assert_eq!(stats.inserts, 2);
        assert_eq!(stats.evictions, 0);
    }

    #[test]
    fn test_cache_stats_hit_rate() {
        let stats = CacheStats {
            size: 10,
            capacity: 100,
            hits: 80,
            misses: 20,
            inserts: 20,
            evictions: 0,
        };

        assert_eq!(stats.hit_rate(), 0.8);
    }

    #[test]
    fn test_cache_stats_usage_rate() {
        let stats = CacheStats {
            size: 50,
            capacity: 100,
            hits: 0,
            misses: 0,
            inserts: 0,
            evictions: 0,
        };

        assert_eq!(stats.usage_rate(), 0.5);
    }

    #[test]
    fn test_cache_reset_stats() {
        let mut cache = CostCache::new(100);

        cache.insert(1, 10);
        cache.get(1);
        cache.get(2);

        cache.reset_stats();

        let stats = cache.get_stats();
        assert_eq!(stats.hits, 0);
        assert_eq!(stats.misses, 0);
        assert_eq!(stats.inserts, 0);
        assert_eq!(stats.evictions, 0);

        // 缓存内容应该保留
        assert_eq!(cache.get(1), Some(10));
    }

    #[test]
    fn test_cache_stats_zero_division() {
        let stats = CacheStats {
            size: 0,
            capacity: 0,
            hits: 0,
            misses: 0,
            inserts: 0,
            evictions: 0,
        };

        // 应该不会发生除零错误
        assert_eq!(stats.hit_rate(), 0.0);
        assert_eq!(stats.usage_rate(), 0.0);
    }
}
