# Design basis · 事实来源与设计假设

这份说明只保留能支持公开工程理解的最小证据，不复制访谈原件、研究原始材料或个人信息。每条内容区分“工程事实”和“设计假设”。原始项目上下文/架构/任务文档属于包外来源类别，本包不把它们伪装成可点击的公开证据；公开读者应以本页所列的包内文档和代码路径为准。

| 关键决定 | 包内可达证据 | 公开工程中的落点 | 仍然是设计假设的部分 |
|---|---|---|---|
| 把记录转成可判断的歌词/音乐结果 | `Docs/PRODUCT_AND_FLOW.md`、`Docs/ARCHITECTURE.md` 的公开流程说明 | `Core/domain/`、`Features/compose/`、`cloudfunctions/generateMusic/` | 音乐化记录是否比文字记录更有长期价值，尚未验证 |
| 让用户在生成后判断和调整 | `Docs/PRODUCT_AND_FLOW.md` 的任务表；`UI/pages/diary/` 与 `UI/pages/music/` | `UI/pages/diary/`、`UI/pages/music/`、`Core/domain/song-detail.js` | 哪种调整粒度最容易理解，仍需真机与用户测试 |
| 保存、私密、删除是明确控制项 | `Docs/IMPLEMENTATION_MAP.md` 的控制边界表；云函数目录和本地测试 | `Services/database/` 与 `cloudfunctions/` | 云端权限、音频清理和端到端删除结果仍待环境验证 |
| Demo 与云端方案分开 | `config/app-config.js`、`data/demo-catalog.js`、`Docs/RUN_AND_VERIFICATION.md` | Demo 数据只经 `data/demo-catalog.js` 进入；云端能力走 `Services/`/`cloudfunctions/` | Demo 预置歌曲不代表真实 AI 生成或生产数据 |
| 先用静态预览解释界面结构 | `Docs/evidence/INTERFACE_EVIDENCE.md` 与包内 PNG | `Docs/evidence/emotion-music-diary-preview.png` | 静态预览不能证明微信运行、真机交互或真实播放 |

## 从证据到产品定义

公开包采用的 CREATE 叙事是：

```text
用户主动记录情绪/事件
  → 选择必要的情绪与隐私边界
  → 生成歌词与音乐草稿
  → 用户判断、调整、保存或不保留
```

这条流程来自包内产品/架构说明和页面实现；这些说明是在复核包外源工程上下文后重新整理的公开摘要，不是对访谈结果的重新推断。回听、历史回顾和提醒属于保存后的次级体验，公开包不把它们写成核心任务的已验证结论。
