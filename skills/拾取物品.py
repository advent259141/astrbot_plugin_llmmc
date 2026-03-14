"""
技能: 拾取物品
描述: 自动拾取附近掉落的物品
"""

async def 拾取物品(bot, itemName=None, maxDistance=16, timeout=30):
    """
    自动拾取附近掉落的物品
    
    Args:
        bot: BotAPI实例
        itemName: 指定要拾取的物品名称（可选，不指定则拾取所有物品）
        maxDistance: 最大搜索范围（默认16格）
        timeout: 超时时间秒数（默认30秒）
    
    Returns:
        拾取结果
    """
    import time
    
    bot.log(f"开始拾取物品，范围: {maxDistance}格" + (f"，目标: {itemName}" if itemName else ""))
    await bot.chat("开始捡东西喵~" + (f" 找{itemName}" if itemName else ""))
    
    picked_count = 0
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        # 扫描附近的掉落物
        scan_result = await bot.scanEntities(range=maxDistance, entityType="item")
        
        if not scan_result.get("success"):
            bot.log("扫描实体失败")
            await bot.wait(1)
            continue
        
        entities = scan_result.get("entities", [])
        
        # 过滤出掉落物
        items = []
        for entity in entities:
            # 掉落物的 type 通常是 "item" 或 name 包含物品名
            if entity.get("type") == "item" or entity.get("name") == "item":
                # 如果指定了物品名，进行过滤
                # 注意：掉落物的 displayName 可能包含具体物品名
                if itemName:
                    display_name = entity.get("displayName", "").lower()
                    entity_name = entity.get("name", "").lower()
                    if itemName.lower() not in display_name and itemName.lower() not in entity_name:
                        continue
                items.append(entity)
        
        if not items:
            # 没有找到物品
            if picked_count > 0:
                # 已经捡过一些了，可能捡完了
                bot.log(f"没有更多物品了，已拾取 {picked_count} 个")
                break
            else:
                # 完全没找到，等待一下再找
                bot.log("没有找到掉落物品，等待...")
                await bot.wait(2)
                continue
        
        # 按距离排序
        items.sort(key=lambda e: e.get("distance", 999))
        
        # 走向最近的物品
        target_item = items[0]
        item_pos = target_item.get("position", {})
        if not item_pos:
            # 使用直接的坐标
            item_pos = {
                "x": target_item.get("x", 0),
                "y": target_item.get("y", 0),
                "z": target_item.get("z", 0)
            }
        
        item_x = item_pos.get("x", target_item.get("x", 0))
        item_y = item_pos.get("y", target_item.get("y", 0))
        item_z = item_pos.get("z", target_item.get("z", 0))
        distance = target_item.get("distance", 0)
        
        bot.log(f"发现物品在 ({item_x}, {item_y}, {item_z})，距离: {distance:.1f}")
        
        # 如果距离较远，走过去
        if distance > 2:
            bot.log("走向物品...")
            goto_result = await bot.goTo(item_x, item_y, item_z)
            
            if not goto_result.get("success"):
                # 走不过去，跳过这个物品
                bot.log(f"无法到达物品: {goto_result.get('message')}")
                await bot.wait(1)
                continue
        
        # 物品应该被自动拾取了（走近就会捡起）
        # 等待一下让游戏处理拾取
        await bot.wait(0.5)
        picked_count += 1
        bot.log(f"拾取成功！已拾取 {picked_count} 个物品")
        
        # 短暂休息，避免太快
        await bot.wait(0.3)
    
    # 停止移动
    await bot.stopMoving()
    
    if picked_count > 0:
        await bot.chat(f"捡完啦喵~ 共拾取了 {picked_count} 个物品!")
        return {
            "success": True,
            "picked": picked_count,
            "message": f"成功拾取 {picked_count} 个物品"
        }
    else:
        await bot.chat("没有找到可以捡的东西喵...")
        return {
            "success": False,
            "picked": 0,
            "message": "没有找到可拾取的物品"
        }