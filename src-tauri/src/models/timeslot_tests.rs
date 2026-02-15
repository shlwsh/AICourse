// ============================================================================
// TimeSlot 位运算单元测试
// ============================================================================
// 本测试模块验证 TimeSlot 结构体的位运算方法的正确性
//
// 测试覆盖：
// 1. 标准5天8节的位置计算
// 2. 边界条件测试（第0天第0节，第4天第7节）
// 3. 扩展周期的位置计算（支持1-30天，1-12节）
// 4. 往返转换的一致性测试
// ============================================================================

#[cfg(test)]
mod tests {
    use crate::models::TimeSlot;

    // ========================================================================
    // 测试组 1：标准5天8节的位置计算
    // ========================================================================

    #[test]
    fn test_standard_5day_8period_bit_position() {
        // 测试标准周期（5天 × 8节 = 40个时间槽位）
        let periods_per_day = 8;

        // 周一第1节（day=0, period=0）
        let slot = TimeSlot::new(0, 0);
        assert_eq!(slot.to_bit_position(periods_per_day), 0);

        // 周一第2节（day=0, period=1）
        let slot = TimeSlot::new(0, 1);
        assert_eq!(slot.to_bit_position(periods_per_day), 1);

        // 周一第8节（day=0, period=7）
        let slot = TimeSlot::new(0, 7);
        assert_eq!(slot.to_bit_position(periods_per_day), 7);

        // 周二第1节（day=1, period=0）
        let slot = TimeSlot::new(1, 0);
        assert_eq!(slot.to_bit_position(periods_per_day), 8);

        // 周三第5节（day=2, period=4）
        let slot = TimeSlot::new(2, 4);
        assert_eq!(slot.to_bit_position(periods_per_day), 20);

        // 周五第8节（day=4, period=7）
        let slot = TimeSlot::new(4, 7);
        assert_eq!(slot.to_bit_position(periods_per_day), 39);
    }

    #[test]
    fn test_standard_5day_8period_to_mask() {
        // 测试位掩码生成
        let periods_per_day = 8;

        // 周一第1节应该是第0位
        let slot = TimeSlot::new(0, 0);
        assert_eq!(slot.to_mask(periods_per_day), 1u64 << 0);

        // 周一第2节应该是第1位
        let slot = TimeSlot::new(0, 1);
        assert_eq!(slot.to_mask(periods_per_day), 1u64 << 1);

        // 周二第1节应该是第8位
        let slot = TimeSlot::new(1, 0);
        assert_eq!(slot.to_mask(periods_per_day), 1u64 << 8);

        // 周五第8节应该是第39位
        let slot = TimeSlot::new(4, 7);
        assert_eq!(slot.to_mask(periods_per_day), 1u64 << 39);
    }

    // ========================================================================
    // 测试组 2：边界条件测试
    // ========================================================================

    #[test]
    fn test_boundary_first_slot() {
        // 测试第一个时间槽位（第0天第0节）
        let periods_per_day = 8;
        let slot = TimeSlot::new(0, 0);

        assert_eq!(slot.day, 0);
        assert_eq!(slot.period, 0);
        assert_eq!(slot.to_bit_position(periods_per_day), 0);
        assert_eq!(slot.to_mask(periods_per_day), 1u64);
    }

    #[test]
    fn test_boundary_last_slot_5day_8period() {
        // 测试标准周期的最后一个时间槽位（第4天第7节）
        let periods_per_day = 8;
        let slot = TimeSlot::new(4, 7);

        assert_eq!(slot.day, 4);
        assert_eq!(slot.period, 7);
        assert_eq!(slot.to_bit_position(periods_per_day), 39);
        assert_eq!(slot.to_mask(periods_per_day), 1u64 << 39);
    }

    #[test]
    fn test_boundary_last_slot_7day_12period() {
        // 测试扩展周期的边界（7天 × 12节 = 84个时间槽位，超过64位）
        let periods_per_day = 12;
        let slot = TimeSlot::new(6, 11);

        assert_eq!(slot.day, 6);
        assert_eq!(slot.period, 11);
        assert_eq!(slot.to_bit_position(periods_per_day), 83);
        // 注意：83 > 63，超出 u64 范围，需要使用 ExtendedTimeSlotMask
    }

    // ========================================================================
    // 测试组 3：扩展周期的位置计算
    // ========================================================================

    #[test]
    fn test_extended_period_1day_12period() {
        // 测试1天12节的配置（培训机构场景）
        let periods_per_day = 12;

        // 第1天第1节
        let slot = TimeSlot::new(0, 0);
        assert_eq!(slot.to_bit_position(periods_per_day), 0);

        // 第1天第12节
        let slot = TimeSlot::new(0, 11);
        assert_eq!(slot.to_bit_position(periods_per_day), 11);
    }

    #[test]
    fn test_extended_period_6day_10period() {
        // 测试6天10节的配置（6天工作制）
        let periods_per_day = 10;

        // 第1天第1节
        let slot = TimeSlot::new(0, 0);
        assert_eq!(slot.to_bit_position(periods_per_day), 0);

        // 第3天第5节
        let slot = TimeSlot::new(2, 4);
        assert_eq!(slot.to_bit_position(periods_per_day), 24);

        // 第6天第10节
        let slot = TimeSlot::new(5, 9);
        assert_eq!(slot.to_bit_position(periods_per_day), 59);
    }

    #[test]
    fn test_extended_period_30day_8period() {
        // 测试30天8节的配置（月度排课）
        let periods_per_day = 8;

        // 第1天第1节
        let slot = TimeSlot::new(0, 0);
        assert_eq!(slot.to_bit_position(periods_per_day), 0);

        // 第15天第4节
        let slot = TimeSlot::new(14, 3);
        assert_eq!(slot.to_bit_position(periods_per_day), 115);

        // 第30天第8节
        let slot = TimeSlot::new(29, 7);
        assert_eq!(slot.to_bit_position(periods_per_day), 239);
        // 注意：239 > 63，超出 u64 范围
    }

    // ========================================================================
    // 测试组 4：往返转换的一致性测试
    // ========================================================================

    #[test]
    fn test_roundtrip_conversion_standard() {
        // 测试标准周期的往返转换一致性
        let periods_per_day = 8;

        for day in 0..5 {
            for period in 0..8 {
                let original = TimeSlot::new(day, period);
                let bit_pos = original.to_bit_position(periods_per_day);
                let converted = TimeSlot::from_bit_position(bit_pos, periods_per_day);

                assert_eq!(
                    original, converted,
                    "往返转换失败：day={}, period={}, bit_pos={}",
                    day, period, bit_pos
                );
            }
        }
    }

    #[test]
    fn test_roundtrip_conversion_extended_6day_10period() {
        // 测试扩展周期的往返转换一致性（6天10节）
        let periods_per_day = 10;

        for day in 0..6 {
            for period in 0..10 {
                let original = TimeSlot::new(day, period);
                let bit_pos = original.to_bit_position(periods_per_day);
                let converted = TimeSlot::from_bit_position(bit_pos, periods_per_day);

                assert_eq!(
                    original, converted,
                    "往返转换失败：day={}, period={}, bit_pos={}",
                    day, period, bit_pos
                );
            }
        }
    }

    #[test]
    fn test_roundtrip_conversion_extended_7day_12period() {
        // 测试扩展周期的往返转换一致性（7天12节）
        let periods_per_day = 12;

        for day in 0..7 {
            for period in 0..12 {
                let original = TimeSlot::new(day, period);
                let bit_pos = original.to_bit_position(periods_per_day);
                let converted = TimeSlot::from_bit_position(bit_pos, periods_per_day);

                assert_eq!(
                    original, converted,
                    "往返转换失败：day={}, period={}, bit_pos={}",
                    day, period, bit_pos
                );
            }
        }
    }

    #[test]
    fn test_from_bit_position_standard() {
        // 测试从位位置创建时间槽位（标准周期）
        let periods_per_day = 8;

        // 位置 0 → 第0天第0节
        let slot = TimeSlot::from_bit_position(0, periods_per_day);
        assert_eq!(slot.day, 0);
        assert_eq!(slot.period, 0);

        // 位置 8 → 第1天第0节
        let slot = TimeSlot::from_bit_position(8, periods_per_day);
        assert_eq!(slot.day, 1);
        assert_eq!(slot.period, 0);

        // 位置 20 → 第2天第4节
        let slot = TimeSlot::from_bit_position(20, periods_per_day);
        assert_eq!(slot.day, 2);
        assert_eq!(slot.period, 4);

        // 位置 39 → 第4天第7节
        let slot = TimeSlot::from_bit_position(39, periods_per_day);
        assert_eq!(slot.day, 4);
        assert_eq!(slot.period, 7);
    }

    #[test]
    fn test_from_bit_position_extended() {
        // 测试从位位置创建时间槽位（扩展周期）
        let periods_per_day = 10;

        // 位置 0 → 第0天第0节
        let slot = TimeSlot::from_bit_position(0, periods_per_day);
        assert_eq!(slot.day, 0);
        assert_eq!(slot.period, 0);

        // 位置 24 → 第2天第4节
        let slot = TimeSlot::from_bit_position(24, periods_per_day);
        assert_eq!(slot.day, 2);
        assert_eq!(slot.period, 4);

        // 位置 59 → 第5天第9节
        let slot = TimeSlot::from_bit_position(59, periods_per_day);
        assert_eq!(slot.day, 5);
        assert_eq!(slot.period, 9);
    }

    // ========================================================================
    // 测试组 5：位掩码操作测试
    // ========================================================================

    #[test]
    fn test_mask_uniqueness() {
        // 测试每个时间槽位的掩码都是唯一的
        let periods_per_day = 8;
        let mut masks = std::collections::HashSet::new();

        for day in 0..5 {
            for period in 0..8 {
                let slot = TimeSlot::new(day, period);
                let mask = slot.to_mask(periods_per_day);

                assert!(
                    masks.insert(mask),
                    "掩码冲突：day={}, period={}, mask={}",
                    day,
                    period,
                    mask
                );
            }
        }

        // 应该有 40 个唯一的掩码
        assert_eq!(masks.len(), 40);
    }

    #[test]
    fn test_mask_combination() {
        // 测试多个时间槽位的掩码可以组合
        let periods_per_day = 8;

        let slot1 = TimeSlot::new(0, 0); // 周一第1节
        let slot2 = TimeSlot::new(0, 1); // 周一第2节
        let slot3 = TimeSlot::new(1, 0); // 周二第1节

        let mask1 = slot1.to_mask(periods_per_day);
        let mask2 = slot2.to_mask(periods_per_day);
        let mask3 = slot3.to_mask(periods_per_day);

        // 组合掩码
        let combined = mask1 | mask2 | mask3;

        // 验证每个槽位都在组合掩码中
        assert_ne!(combined & mask1, 0);
        assert_ne!(combined & mask2, 0);
        assert_ne!(combined & mask3, 0);

        // 验证组合掩码的位数
        assert_eq!(combined.count_ones(), 3);
    }

    #[test]
    fn test_mask_check() {
        // 测试检查时间槽位是否在掩码中
        let periods_per_day = 8;

        let slot1 = TimeSlot::new(0, 0);
        let slot2 = TimeSlot::new(0, 1);
        let slot3 = TimeSlot::new(1, 0);

        // 创建包含 slot1 和 slot2 的掩码
        let mask = slot1.to_mask(periods_per_day) | slot2.to_mask(periods_per_day);

        // slot1 应该在掩码中
        assert_ne!(mask & slot1.to_mask(periods_per_day), 0);

        // slot2 应该在掩码中
        assert_ne!(mask & slot2.to_mask(periods_per_day), 0);

        // slot3 不应该在掩码中
        assert_eq!(mask & slot3.to_mask(periods_per_day), 0);
    }

    // ========================================================================
    // 测试组 6：特殊场景测试
    // ========================================================================

    #[test]
    fn test_different_periods_per_day() {
        // 测试不同的每天节次数配置
        let test_cases = vec![
            (1, 0, 0, 0),   // 1节/天，第0天第0节 → 位置0
            (4, 0, 0, 0),   // 4节/天，第0天第0节 → 位置0
            (4, 1, 2, 6),   // 4节/天，第1天第2节 → 位置6
            (6, 2, 3, 15),  // 6节/天，第2天第3节 → 位置15
            (12, 1, 5, 17), // 12节/天，第1天第5节 → 位置17
        ];

        for (periods_per_day, day, period, expected_pos) in test_cases {
            let slot = TimeSlot::new(day, period);
            let actual_pos = slot.to_bit_position(periods_per_day);

            assert_eq!(
                actual_pos, expected_pos,
                "配置 {}节/天，第{}天第{}节，期望位置 {}，实际位置 {}",
                periods_per_day, day, period, expected_pos, actual_pos
            );
        }
    }

    #[test]
    fn test_timeslot_equality() {
        // 测试时间槽位的相等性
        let slot1 = TimeSlot::new(2, 3);
        let slot2 = TimeSlot::new(2, 3);
        let slot3 = TimeSlot::new(2, 4);

        assert_eq!(slot1, slot2);
        assert_ne!(slot1, slot3);
    }

    #[test]
    fn test_timeslot_hash() {
        // 测试时间槽位可以作为 HashMap 的键
        use std::collections::HashMap;

        let mut map = HashMap::new();
        let slot1 = TimeSlot::new(0, 0);
        let slot2 = TimeSlot::new(1, 2);

        map.insert(slot1, "周一第1节");
        map.insert(slot2, "周二第3节");

        assert_eq!(map.get(&slot1), Some(&"周一第1节"));
        assert_eq!(map.get(&slot2), Some(&"周二第3节"));
        assert_eq!(map.len(), 2);
    }
}
