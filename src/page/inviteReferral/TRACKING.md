# 拉新埋点

需求 2857（Web）和 2858（移动端）共用同一套事件。两端都上报到 `POST /api/v1/trace`。按 `name` 统计，再用下面的属性区分端、进入渠道和按钮。

## 客户端

| 端            | 调用                                                | 传输                                                                                                                                                         |
| ------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web           | `src/lib/sendTrackEvent.ts` 的 `track(name, props)` | `props.finger` 是 FingerprintJS 的访客标识。拉新辅助函数固定传入 `props.platform=web`。                                                                      |
| iOS / Android | `lib/track.ts` 的 `track(name, props)`              | `props.finger` 是安装标识（`ins_…`）。`props.platform` 为 `ios` 或 `android`，其他运行时记为 `web`。`props.user_id` 必填，取自当前登录用户；未登录时不上报。 |

Web 的 `userId` 只用于 `once` 去重，不会出现在事件属性里。移动端必须登录后才能访问，因此每条统计都带 `user_id`。

`once` 仍是客户端选项，不会作为事件属性发出。`once` 为 true 时，按 `user_id + finger` 只发一次。拉新事件不使用 `once`。

上报失败只记日志，不打断拉新流程。

以后新增打点直接调用 `track`。不要把具体业务事件写进 `lib/track.ts`。

## 公共属性

每条拉新事件都带这些属性。渠道先看 `platform`，再看 `entry`。

| 属性       | 取值                    | 怎么用                                                          |
| ---------- | ----------------------- | --------------------------------------------------------------- |
| `platform` | `web`、`ios`、`android` | 区分端。Web 固定是 `web`。移动端按系统写入 `ios` 或 `android`。 |
| `finger`   | 字符串                  | 访客或安装标识，不表示渠道，也不表示按钮。                      |
| `user_id`  | 字符串                  | 只有移动端发送。Web 没有这个属性。                              |

## 渠道

拉新页从哪里打开，只看 `invite_referral_page_view` 的 `entry`。不要用其他事件猜测来源。

| `entry`      | 对应渠道           | 判定                                                                                                                     |
| ------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `activation` | 自然注册后自动打开 | 地址带 `?entry=activation`。只有这一种渠道取这个值。                                                                     |
| `direct`     | 其余所有打开       | 没有 `entry=activation` 时都记这个值。侧栏或顶栏「邀请有礼」、受邀注册后的落地、手动打开、刷新，在这个属性上不能再拆开。 |

首页入口要和页面曝光分开看：

| 渠道             | 事件                               | 条件                                                                                                                      |
| ---------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 从首页点进来     | `invite_referral_home_entry_click` | 事件本身就是这个入口。Web 是侧栏「邀请有礼」，移动端是顶栏礼物图标。它没有 `entry`。随后打开的页面曝光是 `entry=direct`。 |
| 自然注册自动打开 | `invite_referral_page_view`        | `entry=activation`。这次没有首页点击事件。                                                                                |
| 受邀注册后打开   | `invite_referral_page_view`        | `entry=direct`，并且同一次进入没有 `invite_referral_home_entry_click`。                                                   |
| 直接打开或刷新   | `invite_referral_page_view`        | 同样是 `entry=direct`，也没有首页点击事件。和受邀落地不能单靠属性分开。                                                   |

## 按钮

同一个事件里有多个按钮时，用额外属性区分。事件名已经唯一对应一个按钮时，不再加按钮属性。

| 按钮                                     | 事件                                | 区分属性                                                                                         |
| ---------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| 侧栏或顶栏「邀请有礼」                   | `invite_referral_home_entry_click`  | 无。用 `platform` 区分 Web 侧栏和移动端顶栏礼物图标。                                            |
| 「新人有礼」或「新人任务」里的「去完成」 | `invite_referral_task_click`        | `task_module` 区分区块，`task_code` 区分哪一条任务。                                             |
| 拉新页上的「立即邀请」                   | `invite_referral_invite_now_click`  | 无。只统计页面上的这个按钮。                                                                     |
| 「邀请码」旁边的「复制」                 | `invite_referral_share_copy_click`  | `target=code`                                                                                    |
| 「邀请链接」旁边的「复制」               | `invite_referral_share_copy_click`  | `target=link`                                                                                    |
| 分享面板关闭                             | `invite_referral_share_close_click` | Web 没有额外属性，关闭图标、遮罩和 Esc 都是同一次关闭。移动端固定 `via=button`，只表示关闭图标。 |

`invite_referral_task_click` 的属性：

| 属性          | 取值                          | 对应按钮                                                                                 |
| ------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| `task_module` | `gift`                        | 「新人有礼」区块。接口 `audience=activation`。                                           |
| `task_module` | `tasks`                       | 「新人任务」区块。`audience` 不是 `activation`，包括 `invitee` 和接口未返回 `audience`。 |
| `task_code`   | `phone_bound`                 | 绑定手机号那一行的「去完成」。                                                           |
| `task_code`   | `file_conversation_completed` | 完成文件或对话那一行的「去完成」。                                                       |
| `task_code`   | `wechat_assistant_bound`      | 绑定微信助手那一行的「去完成」。                                                         |

任务标题由接口的 `title` 决定，统计以 `task_code` 为准。接口如果返回上表以外的 `task_code`，原样写入，不改成这三个值。未绑定手机号时，其他任务的「去完成」仍会计入，并带上该任务自己的 `task_code`。按钮文案是「已完成」时禁用，不计数。

`invite_referral_share_copy_click` 的 `target`：

| 取值   | 按钮                                                             |
| ------ | ---------------------------------------------------------------- |
| `code` | 分享面板里，「邀请码」右侧的「复制」。复制的是邀请码。           |
| `link` | 分享面板里，「邀请链接」右侧的「复制」。复制的是邀请文案和链接。 |

## 事件

| 事件                                | 触发时机                                                   | 属性                                            |
| ----------------------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| `invite_referral_page_view`         | 拉新页展示。自然注册自动打开也记在这里。                   | `entry`：`activation` 或 `direct`。见「渠道」。 |
| `invite_referral_home_entry_click`  | 点击首页「邀请有礼」。                                     | 只有公共属性。                                  |
| `invite_referral_task_click`        | 点击某一行「去完成」，包括只弹出绑定手机号提示的锁定任务。 | `task_module`、`task_code`。见「按钮」。        |
| `invite_referral_invite_now_click`  | 点击拉新页上的「立即邀请」，并打开分享面板。               | 只有公共属性。                                  |
| `invite_referral_share_copy_click`  | 点击分享面板里邀请码或邀请链接旁边的「复制」。             | `target`：`code` 或 `link`。                    |
| `invite_referral_share_close_click` | 分享面板关闭。                                             | Web 无额外属性。移动端 `via=button`。           |

## 两端差异

- Web 的 `invite_referral_page_view` 每次进入页面只记一次。同一页切换到邀请记录不会再记。离开后再进入会再记。
- 移动端的 `invite_referral_page_view` 在页面每次获得焦点时记一次，包括从邀请记录返回。返回后的 `entry` 仍按当前地址计算。
- Web 的 `invite_referral_share_close_click` 来自对话框的 `onOpenChange(false)`。关闭图标、遮罩和 Esc 都算一次面板关闭，属性上不能再拆开。复制按钮仍走各自的点击处理。
- 移动端的 `invite_referral_share_close_click` 只统计关闭图标，点遮罩不记。
- 需要先绑定手机号的受邀移动端用户会先看到绑定页。拉新页曝光在绑定完成后打开拉新页时记录，此时 `entry=direct`。

## 不计数

这些按钮和已统计按钮文案相近，但没有对应事件，不要用现有属性去套：

| 按钮                   | 位置           | 原因                                                               |
| ---------------------- | -------------- | ------------------------------------------------------------------ |
| 底部「立即邀请」       | 移动端分享面板 | 这是分享到微信。计入的是拉新页上的「立即邀请」。                   |
| 「微信好友」「朋友圈」 | 移动端分享方式 | 不统计。                                                           |
| 「复制链接」           | 移动端分享方式 | 不统计。计入的是「邀请链接」旁边的「复制」，属性是 `target=link`。 |
| 「保存图片」           | 移动端分享方式 | 不统计。                                                           |
| 「已完成」             | 任务行         | 按钮禁用，不计数。                                                 |

## 调用位置

Web：

- `src/page/inviteReferral/tracking.ts`
- `src/page/inviteReferral/InviteReferralContent.tsx`
- `src/page/inviteReferral/InviteActivityPanel.tsx`
- `src/page/inviteReferral/InviteShareDialog.tsx`
- `src/page/sidebar/components/Header.tsx`

移动端：

- `lib/track.ts`
- `lib/invite-referral-events.ts`
- `components/invite-referral/tracking.ts`
- `app/invite-referral/index.tsx`
- `components/invite-referral/InviteShareDialog.tsx`
- `app/index.tsx`
