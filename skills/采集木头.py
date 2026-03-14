"""
技能: 采集木头
描述: 自动寻找并采集指定数量的木头（支持各种木头类型）
"""

async def 采集木头(bot, count=1):
    """
    自动寻找并采集指定数量的木头（支持各种木头类型）
    
    策略：
    1. 优先寻找低处的木头（y坐标接近自己）
    2. 直接使用 collectBlock，它会自动走近并挖掘
    3. 如果 collectBlock 失败，跳过这个方块尝试下一个
    
    Args:
        bot: BotAPI实例
        count: 要采集的木头数量，默认1个
    """
    # 支持的木头类型
    wood_types = [
        "oak_log",      # 橡木
        "birch_log",    # 白桦木
        "spruce_log",   # 云杉木
        "jungle_log",   # 丛林木
        "acacia_log",   # 金合欢木
        "dark_oak_log", # 深色橡木
        "mangrove_log", # 红树木
        "cherry_log",   # 樱花木
    ]
    
    collected = 0
    failed_attempts = 0
    max_failed = 5  # 连续失败5次就放弃
    tried_positions = set()  # 记录已尝试过的位置，避免重复
    
    bot.log(f"开始采集木头，目标: {count} 个")
    
    while collected < count and failed_attempts < max_failed:
        # 获取当前位置
        current_pos = await bot.getPosition()
        my_y = current_pos.get("y", 64)
        
        # 寻找最近且最容易到达的木头
        # 策略：扫描所有类型的木头，找到距离最近且y坐标最接近的
        best_wood = None
        best_score = float('inf')  # 分数越低越好
        
        for wood_type in wood_types:
            result = await bot.findBlock(wood_type, 32)
            if result.get("found"):
                pos = result.get("position", {})
                pos_key = f"{pos.get('x')},{pos.get('y')},{pos.get('z')}"
                
                # 跳过已经尝试失败的位置
                if pos_key in tried_positions:
                    continue
                
                # 计算分数：距离 + y坐标差异（优先选择地面附近的）
                distance = result.get("distance", 100)
                y_diff = abs(pos.get("y", 0) - my_y)
                
                # y坐标差异大于5的木头（太高），给予惩罚分数
                if y_diff > 5:
                    y_penalty = y_diff * 2
                else:
                    y_penalty = 0
                
                score = distance + y_penalty
                
                if score < best_score:
                    best_score = score
                    best_wood = {
                        "type": wood_type,
                        "position": pos,
                        "distance": distance,
                        "y_diff": y_diff
                    }
        
        if not best_wood:
            bot.log("附近没有找到可采集的木头")
            await bot.chat(f"找不到木头了喵~ 已采集 {collected}/{count}")
            return {
                "success": collected > 0,
                "collected": collected,
                "target": count,
                "message": f"采集了 {collected}/{count} 个木头，附近没有更多木头了"
            }
        
        pos = best_wood["position"]
        wood_type = best_wood["type"]
        pos_key = f"{pos.get('x')},{pos.get('y')},{pos.get('z')}"
        
        bot.log(f"找到 {wood_type} 在 ({pos.get('x')}, {pos.get('y')}, {pos.get('z')}), 距离: {best_wood['distance']:.1f}, y差: {best_wood['y_diff']}")
        
        # 直接使用 collectBlock，它会自动处理移动和挖掘
        collect_result = await bot.collectBlock(wood_type)
        
        if collect_result.get("success"):
            collected += 1
            failed_attempts = 0  # 重置失败计数
            bot.log(f"采集成功! 进度: {collected}/{count}")
            
            if collected < count:
                await bot.chat(f"采到第{collected}个木头啦喵~ ({collected}/{count})")
        else:
            error_msg = collect_result.get("message", "未知错误")
            bot.log(f"采集失败: {error_msg}")
            
            # 记录失败的位置，避免重复尝试
            tried_positions.add(pos_key)
            failed_attempts += 1
            
            # 如果是无法到达，尝试找其他木头
            if "path" in error_msg.lower() or "reach" in error_msg.lower() or "stuck" in error_msg.lower():
                bot.log("无法到达这个木头，尝试找其他的...")
                continue
    
    # 完成
    if collected >= count:
        await bot.chat(f"采集完成喵~ 共采集了 {collected} 个木头!")
        return {
            "success": True,
            "collected": collected,
            "target": count,
            "message": f"成功采集了 {collected} 个木头"
        }
    else:
        await bot.chat(f"采集中断喵... 只采到 {collected}/{count} 个")
        return {
            "success": False,
            "collected": collected,
            "target": count,
            "message": f"采集中断，只采集了 {collected}/{count} 个木头"
        }