---
title: '云原生与 DevOps — 小白讲解 + 面试题精解'
description: '云原生与 DevOps — 小白讲解 + 面试题精解。'
pubDate: 2026-08-20
updatedDate: 2026-08-20
---

# 第七阶段：云原生与 DevOps（工程化能力）— 讲解与面试题

> **本文档定位：** 对应《简历技术栈学习指南》第七阶段。你简历中写的是"编写12个微服务Dockerfile实现容器化；配置Jenkins Pipeline（代码提交→单元测试→镜像构建→K8s部署），CI/CD部署耗时从40分钟降至10分钟"，以及"熟悉 Docker/Dockerfile，了解 K8s/Jenkins CI/CD"。面试官会重点考察你对容器化原理的理解深度，以及"是不是真的搭过 CI/CD"。
>
> **使用方法：** 每个知识点按 `小白讲解 → 名词详解（举例） → 结合简历案例 → 代码示例 → 面试题` 组织。⭐ 越多越高频。

---

## 目录

- [第一章：Docker（容器化的基石）](#第一章docker容器化的基石)
- [第二章：Kubernetes（K8s，容器编排之王）](#第二章kubernetesk8s容器编排之王)
- [第三章：Jenkins CI/CD（自动化流水线）](#第三章jenkins-cicd自动化流水线)
- [第四章：SonarQube（代码质量门禁）](#第四章sonarqube代码质量门禁)
- [第五章：面试速查表](#第五章面试速查表)

---

# 第一章：Docker（容器化的基石）

## 1.1 什么是 Docker？为什么需要它？

### 小白讲解

想象一个场景：你写的 Java 服务在自己电脑上跑得好好的，扔到测试环境就报错——"我电脑上明明是好的！"（程序员经典对线台词）。原因通常是：

- 你的电脑是 JDK 17，测试环境是 JDK 8
- 你的电脑装了某个字体库，测试环境没有
- 环境变量的配置不一样

**Docker 的解法：把你的应用 + JDK + 依赖库 + 配置，全部打包成一个"镜像"（Image），到哪里都一样。** 一次打包，处处运行。

### 名词详解（必须逐个搞懂）

| 名词 | 通俗解释 | 举例 |
|------|---------|------|
| **镜像（Image）** | 只读的"安装包模板"，包含应用+运行环境+依赖。类比：类（Class）| `openjdk:17-jdk-slim` 是官方 JDK17 镜像；你们公司的 `instruction-service:v1.2.0` 是业务镜像 |
| **容器（Container）** | 镜像运行起来的"实例"。类比：对象（Object）。一个镜像可以启动 N 个容器 | 12 个微服务各一个镜像，生产上 `instruction-service` 起 3 个副本 = 3 个容器 |
| **镜像仓库（Registry）** | 存放镜像的地方，类比 Maven 仓库 | 公司搭的 Harbor 私有仓库；公网 Docker Hub |
| **Dockerfile** | 描述"镜像怎么构建"的脚本，一条条指令对应一层 | `FROM openjdk:17` → `COPY app.jar` → `ENTRYPOINT java -jar` |
| **数据卷（Volume）** | 容器删了数据还在的"外挂硬盘" | 日志目录挂载：`-v /app/logs:/logs`，容器重建后日志不丢 |
| **端口映射** | 宿主机端口 → 容器端口的转发 | `-p 8080:8080`，访问宿主机 8080 就是访问容器 8080 |

### 镜像 vs 容器一句话总结

> **镜像是死的模板，容器是活的进程。** `docker run` 把镜像变成容器，`docker commit`（一般不这么干）把容器变回镜像。类比 Java：镜像是 Class，容器是 new 出来的实例。

## 1.2 Docker 核心原理：_namespaces、Cgroups、联合文件系统

### 小白讲解

面试官问"Docker 和虚拟机的区别"，背不出原理就露馅了。三个核心 Linux 技术：

**① Namespace（命名空间）——隔离"看得见什么"**

Linux 内核提供的隔离机制，让容器里的进程以为自己独占一台机器：

| Namespace | 隔离内容 | 举例 |
|-----------|---------|------|
| PID | 进程编号 | 容器里 Java 进程是 PID 1，宿主机上其实是 PID 12345——容器里的进程互相看不见 |
| NET | 网络栈 | 每个容器有独立的网卡（eth0）、IP、端口空间，所以 12 个微服务容器都能监听 8080 互不冲突 |
| MNT | 文件系统挂载点 | 容器看到的 `/` 是自己的根文件系统，看不到宿主机的其他目录 |
| UTS | 主机名 | 容器里 `hostname` 显示 `instruction-service-7f8b9c`，而不是宿主机名 |
| IPC | 进程间通信 | 信号量、共享内存互相隔离 |

**② Cgroups（控制组）——限制"能用多少"**

Namespace 管"看得见什么"，Cgroups 管"用多少资源"：

```
docker run --memory=1g --cpus=0.5 instruction-service:v1
# 这个容器最多用 1GB 内存、半个 CPU 核
# Java 微服务里对应 K8s 的 resources.limits，防止一个服务内存泄漏拖垮整台物理机
```

**③ 联合文件系统（UnionFS / OverlayFS）——分层"存储"**

这是**镜像分层**的技术基础，见下一节。

### Docker vs 虚拟机（高频面试题）

| 对比维度 | Docker 容器 | 虚拟机（VMware/KVM） |
|---------|-----------|---------------------|
| 隔离级别 | 进程级（共享宿主机内核） | 硬件级（Guest OS 完整内核） |
| 启动速度 | 秒级（就是启动一个进程） | 分钟级（要开机引导整个操作系统） |
| 镜像体积 | MB 级（alpine 基础镜像 5MB） | GB 级（带完整 Windows/Linux） |
| 性能损耗 | 接近 0（共享内核，无指令翻译） | 有（Hypervisor 虚拟化开销） |
| 隔离安全性 | 较弱（内核漏洞可能逃逸） | 强 |

**面试加分点：** "容器本质是宿主机上一个被 Namespace 隔离、被 Cgroups 限流的**特殊进程**，`ps -ef` 在宿主机上能看到容器里的 Java 进程。"

## 1.3 镜像分层：为什么你 12 个服务构建很快？

### 小白讲解

**镜像像千层饼，每一层 Dockerfile 指令对应一层，层是只读的、可复用的。**

```
Dockerfile:                          镜像分层结构：
FROM openjdk:17-jdk-slim   ←———————  Layer 1: 基础 OS + JDK（约 400MB，所有服务共享）
COPY app.jar /app.jar      ←———————  Layer 2: 你的 jar 包（约 80MB）
ENTRYPOINT ["java","-jar"] ←———————  Layer 3: 启动命令（0 字节，仅元数据）
```

**关键机制：**

1. **层缓存（Layer Cache）**：构建时 Docker 检查"这层的指令和文件没变"就直接用缓存。你的 12 个微服务都基于同一个 JDK 基础镜像，基础层只下载/构建一次。
2. **写时复制（Copy-on-Write）**：容器启动时在最上面加一个可写层，读文件时从上往下找，修改文件时先把文件从只读层"复制"到可写层再改。
3. **层共享省磁盘**：12 个服务都基于 `openjdk:17`，宿主机上 JDK 那层只存一份，省下约 4GB 磁盘。

### 举例：为什么"Dockerfile 指令顺序"影响构建速度？

```dockerfile
# ❌ 错误写法：改一行代码，后面所有层缓存全失效
COPY . /app                    # 源码一变，这层缓存就失效
RUN mvn package                # 于是依赖又全部重新下载（5分钟）
COPY target/app.jar app.jar

# ✅ 正确写法：依赖层放前面，源码层放后面
COPY pom.xml .                 # pom 没变 → 缓存命中
RUN mvn dependency:go-offline  # 依赖下载层直接用缓存（秒过）
COPY src ./src                 # 只有源码这层重建
RUN mvn package -DskipTests
```

**这是你简历"CI/CD 从 40 分钟降到 10 分钟"的优化手段之一**：合理分层 + 利用缓存 + 多阶段构建（见下）。

## 1.4 你简历中的 Dockerfile（能默写 + 讲优化）

### 结合简历案例

简历原文："**编写12个微服务Dockerfile实现容器化**"。

面试话术：

> "我们零碳能源云平台拆了 12 个微服务。我先写了一个**统一的基础镜像**（JDK17 + 时区 + 字体 + 健康检查脚本），12 个服务的 Dockerfile 只需要 4 行：FROM 基础镜像 → COPY jar → EXPOSE → ENTRYPOINT，保证了 12 个服务的构建规范一致。中间还踩过一个坑：容器里默认时区是 UTC，日终统计的数据对不上，后来在基础镜像里统一装了 Asia/Shanghai 时区。"

### 生产级 Dockerfile 示例（带详细注释）

```dockerfile
# ========== 基础镜像层（全公司 12 个微服务共享） ==========
FROM eclipse-temurin:17-jre-alpine

# 时区：容器默认 UTC，会导致日志时间和业务统计时间差 8 小时
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone

# 用 root 跑业务是安全红线，创建普通用户
RUN addgroup -S app && adduser -S app -G app
USER app

# ========== 应用层（每个服务独有） ==========
ARG JAR_FILE=target/*.jar
COPY --chown=app:app ${JAR_FILE} app.jar

# JVM 容器参数：让 JVM 感知容器内存限制（-XX:+UseContainerSupport 默认开启）
# MaxRAMPercentage 按容器内存的百分比分配堆，比写死 -Xmx 更适配 K8s 弹性伸缩
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70.0 -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/app/logs/"

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health | grep -q UP || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app.jar"]
```

**为什么用 ENTRYPOINT 不用 CMD？** ENTRYPOINT 是"固定执行的主命令"，CMD 是"默认参数"。用 `exec` 形式的 ENTRYPOINT，Java 进程是容器的 PID 1 进程，能直接接收 `docker stop` 发的 SIGTERM 信号做优雅停机（Spring Boot 会处理 shutdown hook，把正在处理的请求做完再退出）。如果用 `sh -c` 包裹时不注意，PID 1 是 sh，信号传不到 Java，K8s 滚动更新时会杀掉正在处理中的请求。

### 多阶段构建（Multi-stage Build）

```dockerfile
# ===== 阶段一：编译（用带 Maven 的重镜像） =====
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline          # 依赖层缓存
COPY src ./src
RUN mvn package -DskipTests

# ===== 阶段二：运行（只带 JRE 的轻镜像） =====
FROM eclipse-temurin:17-jre-alpine
COPY --from=builder /build/target/app.jar /app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

**好处：** 最终镜像不含 Maven、不含源码、不含编译中间产物，体积从 1GB+ 降到 200MB，**拉镜像和滚动更新的速度都快**——这也是 CI/CD 提速的一环。

## 1.5 常用命令（必须脱口而出）

```bash
docker ps                        # 查看运行中的容器
docker ps -a                     # 包括已退出的（看为什么挂了）
docker logs -f --tail 200 容器名  # 追日志，排查启动失败
docker exec -it 容器名 sh         # 进入容器（相当于 ssh）
docker stats                     # 实时 CPU/内存 —— 对应 Cgroups 限制效果
docker images / docker pull      # 镜像列表 / 拉镜像
docker build -t svc:v1 .         # 构建镜像
docker run -d -p 8080:8080 --name svc svc:v1
docker inspect 容器名             # 看详细配置（IP、挂载、环境变量、退出码）
```

---

# 第二章：Kubernetes（K8s，容器编排之王）

## 2.1 为什么需要 K8s？

### 小白讲解

12 个服务用 Docker 起来之后，新的问题来了：

- 容器挂了谁负责**重启**？
- 流量大了谁负责**扩容**？流量小了谁负责**缩容省钱**？
- 发布新版本时怎么做到**不中断服务**？
- 容器重启后 IP 变了，调用方怎么找到它？

**K8s 就是"容器的操作系统"**：你告诉它期望状态（"我要 3 个副本"），它持续对账（Reconcile），实际状态偏离了就自动纠正。这套思想叫**声明式 API + 控制器模式**——你不说"怎么做到"，只说"我要什么"。

### 名词详解（K8s 核心对象）

| 名词 | 通俗解释 | 举例 |
|------|---------|------|
| **Pod** | K8s 最小调度单元，一个或多个容器的组合（同一 Pod 内容器共享网络和存储） | 你的 `instruction-service` 跑在一个含 1 个容器的 Pod 里；有些场景一个 Pod 挂"业务容器 + 日志采集 sidecar 容器" |
| **Deployment** | 管 Pod 的"复制控制器"：声明副本数、滚动升级、回滚 | `replicas: 3` 表示永远维持 3 个副本，挂一个自动补一个 |
| **Service** | Pod 的"稳定门牌号"。Pod IP 会变，Service 提供固定虚拟 IP（VIP）和负载均衡 | 订单服务调用用户服务：不直连 Pod IP，而是调 `user-service:8080` 这个 Service 名 |
| **Ingress** | 集群大门，把外部 HTTP(S) 流量按域名/路径路由到不同 Service | `api.zero-car.com/device/*` → device-service；`/chat/*` → rag-service |
| **HPA** | Horizontal Pod Autoscaler，水平自动扩缩容 | CPU 超 70% 自动从 2 副本扩到最多 10 副本 |
| **ConfigMap / Secret** | 配置和敏感信息，与镜像解耦 | 数据库连接串放 ConfigMap，密码放 Secret（base64 存储） |
| **Namespace** | 虚拟集群，资源隔离 | `dev` / `test` / `prod` 三套环境在同一个集群 |
| **kubelet** | 每台节点上的"代理人"，负责本节点容器的创建销毁与探针执行 | 节点异常时该节点 Pod 被驱逐到健康节点 |

### Pod 与 Service 的关系（举例）

```
用户请求 → Ingress(网关) → Service(user-service, VIP=10.96.0.10)
                              ↓ 通过 label selector 自动发现
                        Pod(user-service-7f8b9, 10.244.1.5)
                        Pod(user-service-2k9dp, 10.244.2.7)   ← 挂了会被 Deployment 补一个新 Pod
                        Pod(user-service-5s8vk, 10.244.3.2)
                              ↑ Service 在这 3 个 Pod 间做负载均衡（默认 iptables/IPVS 规则）
```

**Service 的几种类型：**
- **ClusterIP**（默认）：集群内部访问的虚拟 IP —— 微服务互相调用用这个
- **NodePort**：在每个节点开一个端口（30000-32767）暴露服务 —— 测试环境凑合用
- **LoadBalancer**：云厂商的负载均衡器 —— 生产对外
- **ExternalName**：DNS CNAME 别名，指向外部服务

## 2.2 Deployment：你简历里"12个微服务"的载体

### 结合简历案例（能背的完整 YAML）

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: instruction-service
  namespace: prod
  labels:
    app: instruction-service
spec:
  replicas: 3                          # 期望 3 副本，挂了自动补
  revisionHistoryLimit: 5              # 保留 5 个历史版本，支持回滚
  strategy:
    rollingUpdate:
      maxSurge: 1                      # 滚动更新时最多多起 1 个新 Pod
      maxUnavailable: 0                # 更新过程中不允许有 Pod 不可用 → 零停机
    type: RollingUpdate
  selector:
    matchLabels:
      app: instruction-service
  template:                            # Pod 模板
    metadata:
      labels:
        app: instruction-service       # Service 靠这个 label 找到 Pod
    spec:
      containers:
      - name: instruction-service
        image: harbor.zero-car.cn/instruction-service:v1.2.0
        ports:
        - containerPort: 8080
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "prod"
        - name: POD_NAME                # 写进日志里，SkyWalking/日志检索能定位到具体 Pod
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        resources:
          requests:                     # 调度依据：K8s 保证至少给这么多
            cpu: 250m                   # 250m = 0.25 核
            memory: 512Mi
          limits:                       # 上限：超过内存 limit 会被 OOMKill
            cpu: 500m
            memory: 1Gi
        livenessProbe:                  # 存活探针：失败就重启容器
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 60       # Spring Boot 启动要 40s，太早探就误杀
          periodSeconds: 10
        readinessProbe:                 # 就绪探针：失败就从 Service 摘除流量（不重启）
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 5
```

### 三种探针（高频考点，必须分清）

| 探针 | 作用 | 失败后果 | 举例 |
|------|------|---------|------|
| **livenessProbe（存活）** | 容器"活着吗"（死锁、假死检测） | **重启容器** | Java 进程死锁了，health 接口超时 → 重启 |
| **readinessProbe（就绪）** | 容器"能接流量吗"（预热中、依赖未就绪） | **从 Service 摘除，不重启** | Spring Boot 启动中 / 刷缓存中 / 依赖 Nacos 未连上 → 暂时不分流 |
| **startupProbe（启动）** | 慢启动应用专用 | 通过前 liveness/readiness 不生效 | 大型 JVM 应用启动要 2 分钟，防止被 liveness 误杀 |

**面试话术：** "我们踩过一个坑：readiness 探针配置不当，服务刚启动缓存没预热就被打进流量，导致一波请求超时。后来加了启动时的缓存预热逻辑，readiness 检查里把'预热完成'也算进去，滚动发布才真正平滑。"

### requests 和 limits 的关系（举例）

- `requests.cpu: 250m`：**调度依据**。K8s 找一台"剩余可分配 CPU ≥ 0.25 核"的节点放这个 Pod。
- `limits.memory: 1Gi`：**硬上限**。容器内存超 1Gi，内核 OOM Killer 直接杀掉容器（`Exit Code 137`）。
- **经验值**：Java 服务 `limits` 设为 `requests` 的 2 倍；`-XX:MaxRAMPercentage=70` 给堆留余量，剩下给元空间/线程栈/堆外。

## 2.3 HPA：自动扩缩容

### 结合简历案例（简历直接写了 HPA）

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: instruction-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: instruction-service
  minReplicas: 2                       # 保底 2 副本（高可用最低要求）
  maxReplicas: 10                      # 峰值最多 10 副本（防雪崩式扩容拖垮集群）
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70         # 平均 CPU 超 70% 就扩容
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 缩容冷静期 5 分钟，防止流量抖动来回缩放
```

**HPA 工作原理（面试常追问）：**

1. HPA 控制器每隔 15 秒向 **Metrics Server** 查询目标 Pod 的实际 CPU/内存
2. 计算期望副本数 = `ceil(当前副本数 × 当前CPU利用率 / 目标利用率)`
   - 例：3 副本平均 CPU 90%，目标 70% → 期望 `ceil(3 × 90/70) = 4` 副本
3. 通知 Deployment 修改 `replicas`
4. 缩容默认有 5 分钟稳定窗口（防止早高峰前后的抖动来回横跳）

**注意：** Pod 必须配置了 `resources.requests`，HPA 的百分比计算才有分母——这是配置 HPA 的前置条件，也是常被追问的细节。

## 2.4 Service 与服务发现：微服务怎么互相找到？

### 小白讲解

在你们 Spring Cloud Alibaba 项目里，其实有**两套服务发现并存**：

- **K8s Service**：`http://instruction-service:8080`（集群内 DNS 名）
- **Nacos**：Spring Cloud 服务注册发现

面试话术（体现你真想过）：

> "我们当时做了取舍：服务间调用走 Nacos 注册发现（配合 Sentinel 限流、Dubbo 负载均衡），K8s Service 主要负责**集群入口流量的负载均衡**和**运维端口暴露**。Nacos 的优势是配置中心 + 服务发现一体，且不绑定 K8s——本地开发、虚拟机部署也能用同一套。"

### K8s Service 负载均衡原理

```
kube-proxy（每个节点上的代理进程）监听 Service 变化
  → 生成 iptables/IPVS 规则
  → 访问 Service VIP (10.96.0.10:8080) 的包
  → 被规则 DNAT 到某个后端 Pod IP (10.244.x.x:8080)
```

- **iptables 模式**：线性规则匹配，服务多了性能下降（万级规则遍历慢）
- **IPVS 模式**：内核哈希表，O(1) 查找，服务多时性能好，还支持 rr/lc 等多种算法

## 2.5 滚动发布与回滚（CI/CD 的最后一公里）

```bash
kubectl set image deployment/instruction-service \
  instruction-service=harbor.xxx.cn/instruction-service:v1.3.0   # 触发滚动更新

kubectl rollout status deployment/instruction-service            # 观察滚动进度

kubectl rollout history deployment/instruction-service           # 查看历史版本

kubectl rollout undo deployment/instruction-service              # 一键回滚到上一版
```

**滚动更新过程（结合 maxSurge=1 / maxUnavailable=0）：**

```
v1 v1 v1  →  v1 v1 v2  →  v1 v2 v2  →  v2 v2 v2
             (新Pod起来,ready探针通过后才继续)
```

**优雅停机的完整链路（高频考点）：**

1. K8s 发 SIGTERM 给容器（Java 是 PID 1 才收得到 → 这就是 Dockerfile 章节说的 ENTRYPOINT exec 形式）
2. Spring Boot 触发 shutdown hook：从 Nacos 反注册、从 K8s readiness 摘除
3. `terminationGracePeriodSeconds`（默认 30s）宽限期内处理完存量请求
4. 超时还没退出 → SIGKILL 强杀

## 2.6 K8s 架构图（面试白板必会）

```
                ┌─────────────────── Control Plane（主节点）───────────────────┐
                │  API Server ←──── 唯一入口，所有 kubectl/控制器都走它        │
                │  etcd        ←──── 集群"大脑数据库"，存所有期望状态           │
                │  Scheduler   ←──── 决定新 Pod 放到哪个节点（看 requests）    │
                │  Controller Manager ← 对账循环：期望状态 vs 实际状态          │
                └───────────────────────────┬────────────────────────────────┘
                                            │ (下发/上报)
     ┌──────────────────────────────────────┼──────────────────────────────────────┐
     │ Node 1                                │ Node 2                               │
     │  kubelet ← 执行器：创建/销毁容器、执行探针                                   │
     │  kube-proxy ← 网络规则：Service VIP → Pod IP                              │
     │  Pod A(instruction-service)  Pod B(device-service)  Pod C(...)            │
     └───────────────────────────────────────────────────────────────────────────┘
```

**一句话讲控制器模式（Reconcile Loop）：** "所有 K8s 控制器都在干同一件事——死循环对比'etcd 里期望的 3 个副本'和'集群里实际的 2 个副本'，发现少了就创建一个，发现多了就删掉一个。"

---

# 第三章：Jenkins CI/CD（自动化流水线）

## 3.1 什么是 CI/CD？

### 名词详解

| 名词 | 全称 | 通俗解释 | 举例 |
|------|------|---------|------|
| **CI** | Continuous Integration 持续集成 | 代码一提交就自动：编译 + 单元测试 + 质量扫描。**目标是尽早暴露集成问题** | 开发提交 MR → Jenkins 自动跑 `mvn test` + SonarQube 扫描 → 测试不过/MR 合不入 |
| **CD** | Continuous Delivery 持续交付 | CI 通过后自动构建镜像、推仓库，**随时可一键部署**到生产 | CI 通过 → 自动 build 镜像 `v1.2.0` 推 Harbor → 等运维点"发布" |
| **CD** | Continuous Deployment 持续部署 | 更进一步，通过后**自动部署**到生产，无需人工点击 | 测试环境全自动，生产环境一般保留人工审批卡点（金融行业合规要求） |

### 小白讲解

你简历写的流水线："**代码提交→单元测试→镜像构建→K8s部署**"，40 分钟优化到 10 分钟。面试官真正想听的是两件事：

1. 流水线每一环**具体做了什么**（有没有真搭过）
2. **40 分钟降到 10 分钟，你做了什么**（优化能力）

## 3.2 Jenkinsfile 全流程（结合简历案例，逐 stage 讲）

```groovy
pipeline {
    agent any
    environment {
        HARBOR = 'harbor.zero-car.cn'
        APP    = 'instruction-service'
        IMAGE  = "${HARBOR}/${APP}:${env.BUILD_NUMBER}"
        K8S_CRED = 'k8s-prod-token'
    }
    stages {

        stage('拉取代码') {
            steps {
                checkout scm
            }
        }

        stage('编译 + 单元测试') {
            steps {
                // 并行编译是提速手段之一（12 个微服务各自独立可并行）
                sh 'mvn -B clean package -DskipTests=false -pl instruction-service -am'
            }
            post {
                always {
                    junit '**/target/surefire-reports/*.xml'    // 测试报告展示
                }
            }
        }

        stage('SonarQube 质量门禁') {
            steps {
                withSonarQubeEnv('sonar-prod') {
                    sh 'mvn sonar:sonar'
                }
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true       // Bug/覆盖率不达标 → 流水线失败
                }
            }
        }

        stage('构建镜像 + 推送 Harbor') {
            steps {
                sh 'docker build -t ${IMAGE} .'
                sh 'docker push ${IMAGE}'
                sh 'docker rmi ${IMAGE} || true'                 // 清理本地缓存省磁盘
            }
        }

        stage('部署 K8s（测试环境）') {
            steps {
                sh '''
                kubectl set image deployment/${APP} ${APP}=${IMAGE} -n test
                kubectl rollout status deployment/${APP} -n test --timeout=300s
                '''
            }
        }

        stage('生产发布（人工审批）') {
            input { message "确认发布到生产环境？" }               // 金融合规：生产必须人工卡点
            steps {
                withCredentials([file(credentialsId: K8S_CRED, variable: 'KUBECONFIG')]) {
                    sh '''
                    kubectl set image deployment/${APP} ${APP}=${IMAGE} -n prod
                    kubectl rollout status deployment/${APP} -n prod --timeout=300s
                    '''
                }
            }
        }
    }
    post {
        failure {
            dingtalk(token: 'xxx', text: "❌ ${APP} #${BUILD_NUMBER} 流水线失败")
        }
    }
}
```

### 逐 stage 名词解释

- **agent any**：流水线在任意可用的 Jenkins 节点上执行
- **stage（阶段）**：流水线的逻辑分段，每个 stage 独立展示成功/失败
- **post / always**：阶段结束后的钩子，`always` 表示无论成败都执行（比如收集测试报告）
- **waitForQualityGate**：阻塞等待 SonarQube 的"质量门禁"结果，不达标直接中断流水线
- **input**：流水线暂停等待人工确认——生产发布的"审批卡点"

## 3.3 40分钟→10分钟：你的优化话术（重点准备！）

面试官必问："CI/CD 从 40 分钟降到 10 分钟，具体怎么优化的？" 分层回答：

**① 构建提速（贡献最大，约省 20 分钟）**
- **Maven 依赖缓存**：把 `.m2/repository` 挂成 Jenkins 节点的持久卷，依赖只下载一次（原来每次全量下载依赖要 10 分钟+）
- **Docker 分层缓存**：依赖层（pom.xml）和源码层分开 COPY，pom 不变时跳过依赖下载层
- **多阶段构建**：编译镜像和运行镜像分离，最终镜像从 1GB+ 降到 200MB
- **并行构建**：一次提交改了多个服务时，12 个微服务的构建 job 并行跑，而不是排队串行

**② 部署提速（约省 5 分钟）**
- **镜像瘦身**：jre-alpine 基础镜像 + 多阶段构建，拉镜像时间从 2 分钟降到 20 秒
- **滚动更新参数调优**：`maxSurge=1, maxUnavailable=0` + readiness 探针及时摘流，发布窗口缩短
- **去掉重复环节**：原来测试和生产的镜像分开构建两次，改为**一次构建、多处部署**（同一镜像 tag 走完测试再上生产，还保证了测试和生产的镜像一致性）

**③ 流程去阻塞（约省 5 分钟）**
- SonarQube 从"全量扫描"改为"增量扫描"
- 单元测试与代码扫描**并行**执行（原来是串行）

**一句话总结话术：** "核心思路是三层：缓存（Maven/Docker 层缓存）、并行（服务并行/测试与扫描并行）、瘦身（多阶段构建 + alpine 基础镜像），最终把 40 分钟压到 10 分钟以内。"

## 3.4 其他 CI/CD 概念（防追问）

| 名词 | 解释 | 举例 |
|------|------|------|
| **Webhook 触发** | GitLab push/MR 事件主动通知 Jenkins 跑流水线（区别于定时轮询 SCM） | MR 合并到 develop 分支 → 自动触发测试环境部署 |
| **Jenkins Agent（ Slave）** | 分布式执行节点，主节点只调度、Agent 干活 | 12 个服务并行构建时，多个 Agent 分摊编译任务 |
| **凭据管理（Credentials）** | 密码/密钥不写死在 Jenkinsfile 里，存 Jenkins 凭据库按 ID 引用 | Harbor 密码、K8s token 都走 `withCredentials` |
| **蓝绿发布 vs 灰度/金丝雀** | 蓝绿=新旧两套环境切流量；金丝雀=新版先接 5% 流量观察 | 金融生产用金丝雀：v2 先 1 个 Pod 接小流量，指标正常再全量 |

---

# 第四章：SonarQube（代码质量门禁）

## 4.1 是什么？名词详解

| 名词 | 解释 | 举例 |
|------|------|------|
| **SonarQube** | 静态代码分析平台，扫出 Bug、漏洞、坏味道（Code Smell）| `if(x=1)` 疑似笔误、空指针风险、System.out 调试代码 |
| **质量门禁（Quality Gate）** | 一组合格标准，不达标流水线中断 | 新代码 Bug=0、覆盖率≥80%、重复率≤3%、无 Blocker 漏洞 |
| **静态分析** | 不运行代码，靠语法树（AST）分析规则 | 发现未关闭的资源、死代码、过长方法 |
| **SonarScanner** | 执行扫描的客户端工具（Maven 插件/独立命令行） | `mvn sonar:sonar` |
| **代码坏味道** | 不是 Bug 但影响可维护性的写法 | 500 行的巨型方法、重复代码块、魔法数字 |

### 结合简历案例

面试话术：

> "我们把 SonarQube 质量门禁嵌在 Jenkins 流水线的编译之后、镜像构建之前，规则是**新增代码** Bug 必须为 0、单测覆盖率不低于 70%。上线前扫出过一次真实问题：交收匹配逻辑里一个 `BigDecimal.equals` 比较（没有考虑 scale，`1.0` 不 equals `1.00`），属于资金类隐患，被门禁拦下来修复后才合入——这个例子我经常用来说明质量门禁的价值。"

**`BigDecimal.equals` 坑（真实高频面试题）：** `new BigDecimal("1.0").equals(new BigDecimal("1.00"))` 返回 **false**（scale 不同），必须用 `compareTo() == 0`。资金系统经典坑，配合你的托管项目讲非常加分。

## 4.2 和其他测试的区别

| 类型 | 是否运行代码 | 举例 |
|------|------------|------|
| 静态分析（SonarQube）| ❌ | 潜在空指针、重复代码 |
| 单元测试（JUnit + Mockito）| ✅ 单类级别 | `assertThat(matchService.match(x)).isEqualTo(y)` |
| 集成测试（Testcontainers）| ✅ 多组件 | 起真实 Kafka/Redis 容器测消息链路 |

---

# 第五章：面试速查表

## Docker（80% 会问）

| 考点 | 一句话答案 |
|------|-----------|
| 镜像 vs 容器 | 镜像是只读模板（Class），容器是运行实例（Object） |
| Docker vs 虚拟机 | 容器=共享内核的隔离进程（秒级/MB级）；VM=完整 Guest OS（分钟级/GB级） |
| 容器隔离原理 | Namespace 隔离视图（PID/NET/MNT/UTS）+ Cgroups 限制资源 |
| 镜像分层 | 每条 Dockerfile 指令一层，只读可复用；容器顶部加可写层（写时复制） |
| 层缓存优化 | 变化少的层放前面（pom.xml 依赖层），变化多的放后面（src 源码层） |
| ENTRYPOINT vs CMD | ENTRYPOINT 固定主命令；CMD 提供默认参数、可被 run 参数覆盖 |
| 为什么用 exec 形式 | java 进程成为 PID 1，能收到 SIGTERM 做优雅停机 |
| 数据卷 | `-v` 挂载宿主机目录，容器销毁数据不丢（日志/配置） |
| 容器时区问题 | 默认 UTC，需在镜像里装 tzdata 并设 Asia/Shanghai |

## Kubernetes（70% 会问）

| 考点 | 一句话答案 |
|------|-----------|
| Pod 是什么 | 最小调度单元，同 Pod 容器共享网络/存储，有独立 Pod IP |
| Deployment 作用 | 声明副本数 + 滚动升级 + 回滚；控制器对账维持期望状态 |
| Service 作用 | Pod IP 易变，Service 提供稳定 VIP + 负载均衡（label selector 选 Pod）|
| Service 类型 | ClusterIP 集群内 / NodePort 节点端口 / LoadBalancer 云 LB |
| 三种探针 | liveness 挂了重启 / readiness 未就绪摘流量 / startup 保护慢启动 |
| requests vs limits | requests 调度依据保底；limits 硬上限，超内存被 OOMKill（137）|
| HPA 原理 | 周期查 Metrics Server → 期望副本=当前×(实际CPU/目标CPU)，缩容有稳定窗 |
| 滚动更新参数 | maxSurge 临时超配新 Pod 数；maxUnavailable 允许不可用数（0=零停机）|
| 优雅停机链路 | SIGTERM → 反注册/摘流 → 宽限期处理存量 → SIGKILL |
| 控制器模式 | 死循环对比 etcd 期望状态与实际状态，发现偏差自动纠正 |

## CI/CD & SonarQube（60% 会问，结合简历）

| 考点 | 一句话答案 |
|------|-----------|
| CI/CD 区别 | CI=提交即编译测试扫描；CD=构建产物随时可发布/自动发布 |
| 流水线阶段 | 拉代码→编译单测→Sonar 门禁→构建推镜像→部署测试→审批→部署生产 |
| 40min→10min 怎么做的 | Maven/Docker 层缓存 + 并行构建 + 多阶段构建瘦身 + 一次构建多处部署 |
| 质量门禁指标 | 新代码 Bug=0、覆盖率阈值、重复率、安全漏洞等级 |
| BigDecimal 坑 | equals 比较 scale，资金比较必须 compareTo==0 |
| 金丝雀发布 | 新版先接小比例流量验证，再逐步全量 |

---

*本文档对应《简历技术栈学习指南》第七阶段，最后更新：2026-08-20*
