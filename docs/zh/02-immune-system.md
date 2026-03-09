# 免疫系统：给AI披上“四层盔甲”

> AI越强大，越需要分层的生存约束——从4671次崩溃到7×24稳定运行，只差这一步。

## 理论内核

**免疫系统**的核心主张是：**AI越强大，越需要分层的生存约束**。就像人体有皮肤、先天免疫、后天免疫多层防御，AI也需要多层机制来识别“允许”与“禁止”。

这不是安全补丁，而是**生存约束**——AI应该拥有什么样的权限？什么绝对不能做？当AI长出“手脚”能操作电脑，这个问题就从技术问题变成了治理问题。

### OpenClaw的四大威胁

伴随OpenClaw爆火而来的，是一场真实的安全风暴：

| 威胁层 | 真实事件 | 后果 |
|--------|----------|------|
| **L4供应链层** | VirusTotal分析超3000个Skills | 数百个恶意Skills，hightower6eu发布314个 |
| **L3网络层** | Censys追踪 | 超过21,000个OpenClaw实例暴露公网 |
| **L2运行时层** | 4671次无效重启 | cron任务漏跑3-4天，36小时CPU白白浪费 |
| **L1配置层** | 重复服务冲突 | 系统级和用户级服务打架，每5秒崩一次 |

### RAK风险框架

安全专家提出的RAK框架，把OpenClaw的风险分为三类：

| 风险类型 | 定义 | 真实案例 |
|---------|------|----------|
| **Root Risk** | AI执行恶意代码，攻陷整个机器 | CVE-2025-6514命令注入漏洞，攻击者可远程执行代码 |
| **Agency Risk** | AI在应用内执行非预期操作 | Meta研究员让AI整理邮箱，结果删了200+封邮件 |
| **Keys Risk** | API密钥、OAuth令牌被窃取 | 12.8 million secrets leaked on GitHub in 2023 |

## 实战操作

### 【L1配置层】基础加固（5分钟）

#### 第一步：清理“幽灵服务”

```bash
# 检查是否有多个同名服务
systemctl list-units | grep openclaw
ps aux | grep openclaw

# 如果发现多个同名服务，立即清理
sudo systemctl stop openclaw-gateway.service
sudo systemctl disable openclaw-gateway.service
sudo rm /etc/systemd/system/openclaw-gateway.service
sudo systemctl daemon-reload

# 检查用户级服务
systemctl --user list-units | grep openclaw
systemctl --user stop openclaw-gateway.service
systemctl --user disable openclaw-gateway.service
rm ~/.config/systemd/user/openclaw-gateway.service
systemctl --user daemon-reload