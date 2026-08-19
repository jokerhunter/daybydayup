---
title: 'Java 核心内功 — 小白讲解 + 面试题精解'
description: 'Java 核心内功 — 小白讲解 + 面试题精解。'
pubDate: 2026-08-20
updatedDate: 2026-08-20
---

# Java 核心内功 — 小白讲解 + 面试题精解

> **定位**：假设你只会写 Spring Boot CRUD，所有概念从零讲起，配代码示例 + 面试题。
> **覆盖**：集合框架 → JUC 并发 → JVM → Java 基础四大模块。
> **用法**：先读讲解理解概念 → 跑代码验证 → 再看面试题自测。

---

# 第一章：集合框架

> 面试官最爱从这里开场。问你 HashMap 底层，答得好说明你不止是"调 API"。

---

## 1.1 HashMap

### 小白讲解

**一句话**：HashMap 就像一个"带编号的抽屉柜"，每个抽屉里放一个链表。

**详细原理**：

```
put("name", "张三") 的过程：

第 1 步：算 hash 值
  "name".hashCode() → 某个整数
  再做扰动：hash = (h = key.hashCode()) ^ (h >>> 16)
  作用：让高位也参与运算，减少碰撞

第 2 步：定位桶（抽屉）
  index = (n - 1) & hash   // n 是数组长度，必须是 2 的幂
  比如数组长度 16，hash=35，index = 15 & 35 = 3
  → 放到第 3 号桶

第 3 步：放入桶
  桶是空的 → 直接放
  桶里有数据 → 遍历链表：
    key 相同（equals 判断）→ 覆盖旧值
    key 不同 → 追加到链表尾部
    链表长度 ≥ 8 且数组长度 ≥ 64 → 链表转红黑树
```

**JDK 1.8 的数据结构**：

```
数组（table）
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│  0  │  1  │  2  │  3  │  4  │  5  │  6  │  7  │
└─────┴─────┴─────┴──┬──┴─────┴─────┴─────┴─────┘
                     │
                    Node
                   ┌───┐
                   │K,V│ → Node → Node → Node → null
                   └───┘    (链表，长度≥8 转红黑树)
```

**扩容机制**：

```java
// 什么时候扩容？
// size > capacity * loadFactor（默认 16 * 0.75 = 12）
// 扩容后：capacity 翻倍（16 → 32 → 64 ...）

// 扩容时元素怎么迁移？
// JDK 1.8 优化：看 hash 的新增高位
// 如果高位是 0 → 原位置
// 如果高位是 1 → 原位置 + 旧容量
// 不需要重新计算 hash，非常高效
```

### 代码验证

```java
public class HashMapDemo {
    public static void main(String[] args) {
        // 默认初始容量 16，负载因子 0.75
        HashMap<String, Integer> map = new HashMap<>();

        // 面试题：为什么容量必须是 2 的幂？
        // 因为用 (n-1) & hash 代替 hash % n，位运算比取模快

        // put 过程
        map.put("apple", 1);
        map.put("banana", 2);
        map.put("apple", 3); // 覆盖，返回旧值 1

        System.out.println(map.get("apple")); // 3

        // 面试题：put 返回什么？
        Integer oldValue = map.put("banana", 99);
        System.out.println(oldValue); // 2（返回被覆盖的旧值）

        // 面试题：HashMap 允许 null 键和 null 值吗？
        map.put(null, 0);     // 允许，null 的 hash 固定为 0
        map.put("nullVal", null); // 允许
        System.out.println(map); // {null=0, apple=3, banana=99, nullVal=null}
    }
}
```

### 面试题

**Q1：HashMap 的底层原理？（高频 ⭐⭐⭐⭐⭐）**

答：JDK 1.8 的 HashMap 是"数组 + 链表 + 红黑树"。
- 数组的每个位置叫"桶"（bucket），通过 `(n-1) & hash` 定位桶下标
- 发生哈希碰撞时，用链表存储（尾插法，JDK 1.7 是头插法）
- 链表长度 ≥ 8 且数组长度 ≥ 64 时，链表转红黑树（查找从 O(n) 降到 O(log n)）
- 红黑树节点数 ≤ 6 时退化回链表
- 默认初始容量 16，负载因子 0.75，扩容翻倍

**Q2：为什么负载因子是 0.75？（中频 ⭐⭐⭐）**

答：空间和时间的折中。
- 如果是 1.0：数组满了才扩容，桶里链表很长，查找慢
- 如果是 0.5：用了一半就扩容，空间浪费大
- 0.75 是数学上的最佳平衡点，同时 0.75 * 16 = 12 是整数，方便计算

**Q3：JDK 1.7 和 1.8 的 HashMap 有什么区别？（高频 ⭐⭐⭐⭐）**

| 对比项 | JDK 1.7 | JDK 1.8 |
|--------|---------|---------|
| 数据结构 | 数组 + 链表 | 数组 + 链表 + 红黑树 |
| 插入方式 | 头插法 | 尾插法 |
| 扩容计算 | 重新计算 hash | 原位置或原位置+旧容量 |
| 并发问题 | 头插法导致链表成环（死循环） | 尾插法不会成环，但仍然不安全 |

**Q4：HashMap 为什么线程不安全？（高频 ⭐⭐⭐⭐）**

答：
1. **JDK 1.7**：并发扩容时头插法导致链表成环，get 操作死循环
2. **JDK 1.8**：尾插法解决了成环问题，但并发 put 仍会数据覆盖（两个线程同时 put 到同一个空桶）
3. **size 丢失**：两个线程同时 put，size 只加了 1
4. 解决方案：用 `ConcurrentHashMap`

**Q5：HashMap 的 key 用自定义对象需要注意什么？（中频 ⭐⭐⭐）**

答：
1. 必须**同时重写** `hashCode()` 和 `equals()`
2. 只重写 equals 不重写 hashCode → 两个"相等"的对象 hash 不同，被放到不同桶，get 不到
3. 不可变最佳：如果 key 的属性被修改导致 hashCode 变化，会找不到原来的值
4. String 之所以适合做 key，因为它不可变且重写了 hashCode 和 equals

---

## 1.2 ConcurrentHashMap

### 小白讲解

**一句话**：ConcurrentHashMap 是线程安全的 HashMap，JDK 1.8 用 CAS + synchronized 实现。

**JDK 1.7 的做法（Segment 分段锁）**：

```
把整个数组分成 16 段（Segment），每段一把锁
不同段的操作可以并行，最多 16 个线程同时写

ConcurrentHashMap
├── Segment[0] (锁) → HashEntry[]
├── Segment[1] (锁) → HashEntry[]
├── ...
└── Segment[15] (锁) → HashEntry[]

缺点：并发度固定为 16，锁粒度还是太粗
```

**JDK 1.8 的做法（CAS + synchronized）**：

```
去掉 Segment，直接对每个桶（Node）加锁
锁粒度从"段"细化到"桶"，并发度大大提高

put 流程：
1. key 的 hash 定位桶
2. 桶为空 → CAS 写入（无锁）
3. 桶不为空 → synchronized 锁住桶头节点 → 链表/树操作
4. 正在扩容 → 帮忙迁移数据（多线程并发扩容）
```

### 代码示例

```java
public class ConcurrentHashMapDemo {
    public static void main(String[] args) throws InterruptedException {
        // 线程安全的计数器
        ConcurrentHashMap<String, LongAdder> counter = new ConcurrentHashMap<>();

        // 100 个线程各加 1000 次
        ExecutorService pool = Executors.newFixedThreadPool(10);
        CountDownLatch latch = new CountDownLatch(100);

        for (int i = 0; i < 100; i++) {
            pool.submit(() -> {
                for (int j = 0; j < 1000; j++) {
                    // computeIfAbsent：不存在时创建，原子操作
                    counter.computeIfAbsent("count", k -> new LongAdder()).increment();
                }
                latch.countDown();
            });
        }

        latch.await();
        System.out.println(counter.get("count")); // 100000，线程安全
        pool.shutdown();
    }
}
```

### 面试题

**Q1：ConcurrentHashMap JDK 1.7 vs 1.8 的区别？（高频 ⭐⭐⭐⭐⭐）**

| 对比项 | JDK 1.7 | JDK 1.8 |
|--------|---------|---------|
| 实现方式 | Segment 分段锁 | CAS + synchronized |
| 锁粒度 | Segment（段） | Node（桶头节点） |
| 并发度 | 固定 16 | 等于桶数量 |
| 数据结构 | Segment[] + HashEntry[] + 链表 | Node[] + 链表 + 红黑树 |
| 查询效率 | 两次 hash（先找 Segment 再找桶） | 一次 hash |

**Q2：为什么 JDK 1.8 用 synchronized 而不是 ReentrantLock？（中频 ⭐⭐⭐⭐）**

答：
1. **锁粒度更细**：只锁一个桶头节点，冲突概率低
2. **JVM 优化**：synchronized 经过偏向锁 → 轻量级锁 → 重量级锁的升级，低竞争时性能很好
3. **内存占用少**：ReentrantLock 需要额外的 AQS 对象（state + 队列），synchronized 是 JVM 内置的
4. **更简单**：不需要手动 unlock，不会忘记释放锁

**Q3：ConcurrentHashMap 的 size() 是精确的吗？（低频 ⭐⭐）**

答：不精确。
- JDK 1.8 用 baseCount + CounterCell[] 累加，多线程下可能有微小误差
- 如果需要精确值，可以用 `mappingCount()` 返回 long 类型
- 实际开发中很少在并发环境下依赖精确的 size

---

## 1.3 ArrayList vs LinkedList

### 小白讲解

**ArrayList**：底层是数组，像"一排连续的座位"。
- 查询快：直接算下标 O(1)
- 插入/删除慢：要移动后面的元素 O(n)
- 扩容：默认容量 10，满了后扩容 1.5 倍（`oldCapacity + oldCapacity >> 1`）

**LinkedList**：底层是双向链表，像"手拉手的一排人"。
- 查询慢：从头/尾遍历 O(n)
- 插入/删除快：改前后指针就行 O(1)（但要先找到位置）
- 不需要扩容

### 代码对比

```java
public class ListCompareDemo {
    public static void main(String[] args) {
        // ArrayList 扩容过程
        ArrayList<Integer> list = new ArrayList<>(); // 初始容量 10
        for (int i = 0; i < 15; i++) {
            list.add(i);
            // 当 add 第 11 个元素时，扩容到 15（10 * 1.5）
            // 当 add 第 16 个元素时，扩容到 22（15 * 1.5）
        }

        // 面试题：ArrayList 的 remove 陷阱
        List<Integer> list2 = new ArrayList<>(Arrays.asList(1, 2, 3, 4, 5));
        // 正确删除方式
        list2.removeIf(i -> i % 2 == 0); // 删除偶数 [1, 3, 5]
        // 错误方式：for + remove 会导致 ConcurrentModificationException
        // 或者跳过元素（因为 remove 后 index 前移了）
    }
}
```

### 面试题

**Q1：ArrayList 和 LinkedList 的区别？（高频 ⭐⭐⭐⭐）**

| 对比项 | ArrayList | LinkedList |
|--------|-----------|------------|
| 底层 | 动态数组 | 双向链表 |
| 查询 | O(1) | O(n) |
| 插入/删除（尾部）| 均摊 O(1) | O(1) |
| 插入/删除（中间）| O(n) | 查找 O(n) + 插入 O(1) |
| 内存 | 连续，缓存友好 | 每个节点多两个指针 |
| 线程安全 | 不安全 | 不安全 |

**Q2：ArrayList 扩容机制？（中频 ⭐⭐⭐）**

答：
1. 无参构造：初始容量 10（JDK 1.7 直接创建 10 的数组，1.8 延迟到第一次 add）
2. 扩容为原来的 1.5 倍：`newCapacity = oldCapacity + (oldCapacity >> 1)`
3. 用 `Arrays.copyOf` 复制旧数据到新数组
4. 如果指定了初始容量，可以避免频繁扩容

---

# 第二章：并发编程（JUC）

> **这是 CRUD 开发者最容易被问穿的领域。** 简历写了"CompletableFuture""DCL""线程池"，面试官一定会深挖。

---

## 2.1 线程基础

### 小白讲解

**什么是线程？**

把进程想象成一个工厂，线程就是工厂里的工人。一个工厂可以有多个工人，他们共享工厂的资源（内存），但各自做不同的活。

**线程的生命周期**：

```
NEW（新建）
  │ start()
  ↓
RUNNABLE（就绪/运行）←─── 时间片用完 ───→
  │                                          ↑
  ├─ wait() ──→ WAITING ──notify()─────────┤
  ├─ wait(timeout) → TIMED_WAITING ─────────┤
  ├─ LockSupport.park() → WAITING ──────────┘
  └─ run() 结束 → TERMINATED（终止）
```

### 代码示例

```java
public class ThreadDemo {
    public static void main(String[] args) throws InterruptedException {
        // 方式 1：继承 Thread
        Thread t1 = new Thread(() -> {
            System.out.println("线程1运行：" + Thread.currentThread().getName());
        }, "my-thread-1");

        // 方式 2：实现 Runnable（推荐）
        Runnable task = () -> System.out.println("线程2运行");

        // 方式 3：Callable + FutureTask（有返回值）
        FutureTask<Integer> futureTask = new FutureTask<>(() -> {
            Thread.sleep(1000);
            return 42;
        });

        Thread t3 = new Thread(futureTask);

        t1.start();
        new Thread(task).start();
        t3.start();

        // get() 会阻塞直到线程执行完
        System.out.println("Callable 返回值：" + futureTask.get()); // 42

        // 面试题：start() 和 run() 的区别？
        // start()：启动新线程，JVM 调用 run()
        // run()：普通方法调用，在当前线程执行，不会启动新线程
        // 调两次 start() 会抛 IllegalThreadStateException
    }
}
```

### 面试题

**Q1：run() 和 start() 的区别？（高频 ⭐⭐⭐⭐）**

答：
- `start()`：启动一个新线程，JVM 自动调用 `run()` 方法。一个线程只能 start 一次
- `run()`：普通方法，在当前线程同步执行。可以直接调用但没有多线程效果

**Q2：为什么有了 Runnable 还要有 Callable？（中频 ⭐⭐⭐）**

答：
- Runnable 的 `run()` 方法没有返回值，也不能抛出 checked exception
- Callable 的 `call()` 方法有返回值，可以抛出异常
- 配合 Future/FutureTask 可以获取异步执行结果

**Q3：线程的 sleep() 和 wait() 的区别？（高频 ⭐⭐⭐⭐）**

| 对比项 | sleep() | wait() |
|--------|---------|--------|
| 所属类 | Thread | Object |
| 释放锁 | 不释放 | 释放 |
| 使用位置 | 任意 | synchronized 块内 |
| 唤醒方式 | 超时自动 | notify/notifyAll 或超时 |
| 用途 | 暂停当前线程 | 线程间通信 |

---

## 2.2 synchronized vs ReentrantLock

### 小白讲解

**synchronized** 是 Java 内置的关键字，像"公共厕所的门锁"——进去就锁门，出来自动开锁。

**ReentrantLock** 是 JDK 提供的类，像"可预约的门锁"——可以设超时、可以响应中断、可以有多个条件变量。

```
synchronized 的三种使用方式：

1. 修饰实例方法 → 锁的是当前实例对象（this）
   public synchronized void method() { ... }

2. 修饰静态方法 → 锁的是 Class 对象
   public static synchronized void method() { ... }

3. 修饰代码块 → 锁的是指定对象
   synchronized(obj) { ... }
```

**synchronized 的底层原理**：

```
对象头里有一个 Mark Word，存储锁信息：

无锁状态 → 偏向锁 → 轻量级锁 → 重量级锁

偏向锁：   只有一个线程访问，直接记录线程 ID（几乎无开销）
轻量级锁： 多个线程交替访问，用 CAS 自旋（不阻塞）
重量级锁： 真正竞争，操作系统层面的互斥量（线程阻塞/唤醒）
```

### 代码对比

```java
public class LockCompareDemo {
    private int count = 0;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition condition = lock.newCondition();

    // 方式 1：synchronized
    public synchronized void syncIncrement() {
        count++;
    }

    // 方式 2：ReentrantLock
    public void lockIncrement() {
        lock.lock();
        try {
            count++;
        } finally {
            // 必须在 finally 中释放锁！
            lock.unlock();
        }
    }

    // ReentrantLock 独有功能：可中断的锁获取
    public void interruptibleLock() throws InterruptedException {
        // 如果线程被 interrupt，会抛 InterruptedException，不会死等
        lock.lockInterruptibly();
        try {
            // do something
        } finally {
            lock.unlock();
        }
    }

    // ReentrantLock 独有功能：超时获取
    public boolean tryLockWithTimeout() {
        try {
            // 最多等 3 秒
            return lock.tryLock(3, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            return false;
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    // ReentrantLock 独有功能：公平锁
    // new ReentrantLock(true) → 先到先得
    // new ReentrantLock(false) → 非公平，可能插队（默认）
}
```

### 面试题

**Q1：synchronized 和 ReentrantLock 的区别？（高频 ⭐⭐⭐⭐⭐）**

| 对比项 | synchronized | ReentrantLock |
|--------|-------------|---------------|
| 类型 | 关键字 | 类（JUC） |
| 释放锁 | 自动 | 手动（必须 finally） |
| 可中断 | 不可 | lockInterruptibly() |
| 超时获取 | 不可 | tryLock(timeout) |
| 公平锁 | 只有非公平 | 可选公平/非公平 |
| 条件变量 | 1 个（wait/notify） | 多个（Condition） |
| 锁绑定 | 对象 | Lock 对象 |
| 性能 | JDK 1.6 后优化很大 | 竞争激烈时略优 |

**Q2：synchronized 的锁升级过程？（高频 ⭐⭐⭐⭐）**

答：
1. **无锁**：对象刚创建
2. **偏向锁**：第一个线程访问，在 Mark Word 记录线程 ID。下次同一线程进入不需要 CAS
3. **轻量级锁**：出现竞争（第二个线程），撤销偏向锁，用 CAS 自旋获取
4. **重量级锁**：自旋超过阈值（默认 10 次）或有第三个线程竞争，升级为重量级锁，未获取锁的线程进入阻塞队列

**注意**：锁只能升级不能降级（GC 除外）。

**Q3：什么是 DCL（双重检查锁）单例？（高频 ⭐⭐⭐⭐⭐）**

**简历直接写了 DCL，必须会答！**

```java
public class Singleton {
    // 为什么 volatile？看下方解释
    private static volatile Singleton instance;

    private Singleton() {}

    public static Singleton getInstance() {
        if (instance == null) {                  // 第一次检查：避免不必要的加锁
            synchronized (Singleton.class) {
                if (instance == null) {          // 第二次检查：防止重复创建
                    instance = new Singleton();  // 非原子操作！
                }
            }
        }
        return instance;
    }
}
```

**为什么必须加 volatile？**

`instance = new Singleton()` 不是原子操作，分为 3 步：
1. 分配内存空间
2. 初始化对象
3. 将引用指向内存地址

如果没有 volatile，指令重排序可能让 2 和 3 互换顺序：
- 线程 A 执行到步骤 3（引用已赋值，但对象还没初始化）
- 线程 B 第一次检查 `instance != null`，直接返回未初始化的对象 → **NPE！**

volatile 通过内存屏障禁止重排序，保证对象完全初始化后才对其他线程可见。

---

## 2.3 volatile

### 小白讲解

**一句话**：volatile 保证两个事——可见性和有序性，但不保证原子性。

**可见性**：

```
每个线程有自己的 CPU 缓存（工作内存）
普通变量：线程 A 修改了值，线程 B 可能看不到（读的是自己的缓存）
volatile 变量：线程 A 修改后，强制刷回主内存；线程 B 读时强制从主内存读

底层实现：x86 架构下，volatile 写会生成 lock 前缀指令
→ 触发缓存一致性协议（MESI）→ 其他 CPU 缓存行失效
```

**有序性（禁止指令重排序）**：

```
编译器和 CPU 为了优化性能，可能会打乱指令顺序（单线程下结果不变）

volatile 通过插入内存屏障（Memory Barrier）禁止重排序：
- volatile 写之前的操作，不能重排到写之后
- volatile 读之后的操作，不能重排到读之前
```

### 代码验证

```java
public class VolatileDemo {
    // 不加 volatile：子线程可能永远看不到 flag 变成 false
    // private static boolean flag = true;

    // 加 volatile：主线程修改后，子线程立即可见
    private static volatile boolean flag = true;

    public static void main(String[] args) throws InterruptedException {
        new Thread(() -> {
            System.out.println("子线程启动，等待 flag 变 false...");
            while (flag) {
                // 空循环，不加 volatile 时可能一直读缓存
            }
            System.out.println("子线程检测到 flag = false，退出");
        }).start();

        Thread.sleep(1000);
        System.out.println("主线程设置 flag = false");
        flag = false;

        // volatile 不保证原子性：
        // volatile int count = 0;
        // count++ 不是原子操作（读-改-写三步）
        // 多线程下 count++ 仍然会丢失更新
    }
}
```

### 面试题

**Q1：volatile 能保证原子性吗？（高频 ⭐⭐⭐⭐）**

答：不能。`count++` 是"读-改-写"三步操作，volatile 只保证每一步可见，但三步之间可以被其他线程打断。要保证原子性用 `AtomicInteger` 或 `synchronized`。

**Q2：volatile 和 synchronized 的区别？（中频 ⭐⭐⭐）**

| 对比项 | volatile | synchronized |
|--------|----------|-------------|
| 原子性 | 不保证 | 保证 |
| 可见性 | 保证 | 保证 |
| 有序性 | 保证 | 保证 |
| 阻塞 | 不阻塞 | 可能阻塞 |
| 编译优化 | 禁止 JIT 对该变量的优化 | 不影响 |
| 使用场景 | 状态标志位、DCL | 复合操作、临界区 |

---

## 2.4 CAS 与 AQS

### 小白讲解

**CAS（Compare And Swap）**：比较并交换，是乐观锁的核心思想。

```
生活类比：你去取快递，快递柜上贴的取件码是 1234
  你输入 1234（期望值）→ 柜子验证匹配 → 开门取件（更新值）
  如果有人在你之前取了（值已变）→ 验证不匹配 → 你取不了

CAS(V, E, N)：
  V = 内存中的值
  E = 期望的值
  N = 要更新的新值
  如果 V == E → 把 V 更新为 N，返回 true
  如果 V != E → 说明被别人改了，不更新，返回 false
```

**ABA 问题**：

```
线程 1 读到值 A
线程 2 把 A 改成 B，又改回 A
线程 1 CAS(A → C) 成功

问题：线程 1 以为没人动过，但实际上值变化过
解决：AtomicStampedReference（加版本号）
      A(版本1) → B(版本2) → A(版本3)
      线程 1 CAS 时发现版本号变了，CAS 失败
```

**AQS（AbstractQueuedSynchronizer）**：

```
AQS 是 JUC 锁和同步器的基础框架
ReentrantLock、CountDownLatch、Semaphore、CyclicBarrier 底层都是 AQS

核心思想：
  一个 volatile int state 表示同步状态
  一个 FIFO 双向队列存储等待的线程

以 ReentrantLock 的非公平锁为例：
  lock()：
    1. CAS 尝试把 state 从 0 改为 1
    2. 成功 → 获取锁，记录持有线程
    3. 失败 → 加入等待队列，park 阻塞

  unlock()：
    1. state 减 1
    2. 如果 state == 0 → 释放锁，唤醒队列头部的线程
```

### 代码示例

```java
public class CASDemo {
    public static void main(String[] args) {
        AtomicInteger atomicInt = new AtomicInteger(0);

        // CAS 操作
        boolean success = atomicInt.compareAndSet(0, 10);
        System.out.println(success); // true，当前值=0，更新为 10
        System.out.println(atomicInt.get()); // 10

        success = atomicInt.compareAndSet(0, 20);
        System.out.println(success); // false，当前值=10≠0，不更新
        System.out.println(atomicInt.get()); // 10

        // getAndIncrement 底层就是 CAS 自旋
        // 伪代码：
        // do {
        //     oldValue = get();
        //     newValue = oldValue + 1;
        // } while (!compareAndSet(oldValue, newValue));
        // 如果 CAS 失败就重试，直到成功

        // ABA 问题演示
        AtomicInteger value = new AtomicInteger(1);
        // 线程 1
        new Thread(() -> {
            int v = value.get(); // 读到 1
            try { Thread.sleep(100); } catch (Exception e) {}
            // 在此期间线程 2 把 1→2→1
            boolean result = value.compareAndSet(v, 10);
            System.out.println("线程1 CAS 结果：" + result); // true，但中间被改过
        }).start();

        // 线程 2
        new Thread(() -> {
            value.compareAndSet(1, 2); // 1→2
            value.compareAndSet(2, 1); // 2→1
        }).start();
    }
}
```

### 面试题

**Q1：CAS 的原理和存在的问题？（高频 ⭐⭐⭐⭐⭐）**

答：
- **原理**：CAS 是无锁优化，通过 CPU 的 cmpxchg 指令保证原子性。三个参数：内存值 V、期望值 E、新值 N。V==E 则更新为 N，否则不操作
- **问题 1 - ABA**：值被改了又改回来，CAS 检测不到。用 `AtomicStampedReference` 加版本号解决
- **问题 2 - 自旋开销**：CAS 失败会自旋重试，竞争激烈时 CPU 空转。JDK 1.8 后的自适应自旋会根据历史成功率调整
- **问题 3 - 只保证一个变量原子**：多个变量需要用锁或 `AtomicReference` 封装成对象

**Q2：AQS 的原理？（高频 ⭐⭐⭐⭐⭐）**

答：
1. **state**：volatile int，表示同步状态。ReentrantLock 用 0=未锁定、>0=锁定次数；Semaphore 用剩余许可数
2. **CLH 队列**：双向链表，存储等待获取锁的线程（封装为 Node）
3. **独占模式**：同一时刻只有一个线程能获取资源（ReentrantLock）
4. **共享模式**：多个线程可同时获取资源（Semaphore、CountDownLatch）
5. **模板方法模式**：AQS 定义了获取/释放的流程，子类只需实现 `tryAcquire`/`tryRelease` 等

**Q3：公平锁和非公平锁的区别？（高频 ⭐⭐⭐⭐）**

答：
- **非公平锁**（默认）：新线程直接 CAS 尝试获取锁，成功了就"插队"。优点：吞吐量高；缺点：可能导致队列中的线程长时间拿不到锁
- **公平锁**：新线程先检查队列中有没有等待的线程，有的话排到队尾。优点：不会饥饿；缺点：每次要唤醒队列线程，吞吐量低
- ReentrantLock 默认非公平，`new ReentrantLock(true)` 可设公平

---

## 2.5 线程池（ThreadPoolExecutor）

### 小白讲解

**为什么用线程池？**

```
不用线程池：每个任务 new Thread()，用完就销毁
  → 创建/销毁线程开销大（约 1ms/次）
  → 无法控制线程数量，高并发时可能创建几千个线程直接 OOM
  → 无法统一管理（无法监控、无法限流）

用线程池：线程复用，统一管理
  → 降低资源消耗（线程创建/销毁从 N 次降到 corePoolSize 次）
  → 提高响应速度（任务来了直接用已有线程，不用等创建）
  → 便于管理（统一监控、调优、限流、命名）
```

**ThreadPoolExecutor 的 7 个参数**：

```java
ThreadPoolExecutor(
    int corePoolSize,        // 核心线程数（不会被回收，除非 allowCoreThreadTimeOut）
    int maximumPoolSize,     // 最大线程数（核心 + 非核心）
    long keepAliveTime,      // 非核心线程的空闲存活时间
    TimeUnit unit,           // 时间单位
    BlockingQueue<Runnable> workQueue,  // 任务队列
    ThreadFactory threadFactory,        // 线程工厂（给线程起名字，方便排查）
    RejectedExecutionHandler handler    // 拒绝策略
)
```

**任务提交后的执行流程**（面试必画）：

```
提交任务
    │
    ↓
当前线程数 < corePoolSize？
    │ 是 → 创建核心线程执行任务
    │ 否 ↓
    │
任务队列没满？
    │ 是 → 任务放入队列等待
    │ 否 ↓
    │
当前线程数 < maximumPoolSize？
    │ 是 → 创建非核心线程执行任务
    │ 否 ↓
    │
执行拒绝策略
```

> **关键点**：队列在核心线程之后、非核心线程之前。这意味着如果队列是无界的，maximumPoolSize 永远不生效——这就是 `Executors.newFixedThreadPool` 的问题。

### 线程池的 5 种状态

```java
// ThreadPoolExecutor 源码中的状态定义
private static final int RUNNING    = -1 << COUNT_BITS;  // 111 → 接收新任务，处理队列任务
private static final int SHUTDOWN   =  0 << COUNT_BITS;  // 000 → 不接收新任务，但处理队列任务
private static final int STOP       =  1 << COUNT_BITS;  // 001 → 不接收新任务，不处理队列任务，中断正在执行的任务
private static final int TIDYING    =  2 << COUNT_BITS;  // 010 → 所有任务已终止，线程数为 0
private static final int TERMINATED =  3 << COUNT_BITS;  // 011 → terminated() 方法执行完毕
```

```
RUNNING ──shutdown()──→ SHUTDOWN ──队列空+线程空──→ TIDYING ──terminated()──→ TERMINATED
   │                      │
   └──shutdownNow()──→ STOP ──线程空──→ TIDYING ──terminated()──→ TERMINATED
```

**shutdown() vs shutdownNow()**：

| 方法 | 队列中等待的任务 | 正在执行的任务 | 返回值 |
|------|----------------|--------------|--------|
| shutdown() | 继续执行完 | 等它们自然结束 | void |
| shutdownNow() | 不执行了，返回未执行的任务列表 | 尝试中断（interrupt） | List<Runnable> |

### 4 种拒绝策略

| 策略 | 行为 | 使用场景 |
|------|------|---------|
| AbortPolicy（默认）| 抛 RejectedExecutionException | 严肃系统，不允许丢任务 |
| CallerRunsPolicy | 由提交任务的线程执行 | 不想丢任务，可以接受降速（提交线程被拖慢→自然限流） |
| DiscardPolicy | 直接丢弃，不抛异常 | 允许丢失（日志收集等） |
| DiscardOldestPolicy | 丢弃队列最老的任务，重新提交 | 只关心最新任务（实时行情推送） |

### 队列选择（面试常考）

| 队列 | 特点 | 对线程池的影响 | 适用场景 |
|------|------|-------------|---------|
| **LinkedBlockingQueue**（无界）| 默认容量 Integer.MAX_VALUE | maximumPoolSize 永远不生效，任务堆积→OOM | 不推荐生产使用 |
| **LinkedBlockingQueue**（有界）| 指定容量 | 队列满后才会创建非核心线程 | 大多数场景的推荐选择 |
| **ArrayBlockingQueue**（有界）| 数组实现，固定容量 | 同上 | 需要精确控制队列大小 |
| **SynchronousQueue**（无容量）| 不存储任务，直接交给线程 | 每个任务都必须立即有线程处理，否则创建新线程 | 要求任务立即执行（如 CachedThreadPool） |
| **PriorityBlockingQueue** | 优先级队列 | 按优先级出队 | 任务有优先级区分 |

```java
// 推荐写法：有界队列 + 明确的最大线程数 + 明确的拒绝策略
ThreadPoolExecutor pool = new ThreadPoolExecutor(
    8,                                  // 核心 8 线程
    16,                                 // 最大 16 线程
    60, TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(200),     // 有界队列，最多排队 200 个
    new ThreadFactoryBuilder().setNameFormat("order-pool-%d").build(),
    new ThreadPoolExecutor.CallerRunsPolicy()  // 满了由提交线程执行，自然限流
);
```

### submit() vs execute() 的异常差异（面试重点）

```java
// execute()：异常直接抛到控制台，不会被吞
pool.execute(() -> {
    throw new RuntimeException("execute 的异常");
});
// 控制台直接打印异常堆栈
// 线程会销毁，线程池会补充新线程

// submit()：异常被封装到 Future 中，不会抛出
Future<?> future = pool.submit(() -> {
    throw new RuntimeException("submit 的异常");
});
// 控制台什么都不打印！异常被吞了
// 必须调用 future.get() 才能看到异常
future.get(); // 这里会抛 ExecutionException，包裹着原始异常
```

> **生产建议**：用 `execute()` 提交不需要返回值的任务（异常直接暴露），用 `submit()` 时必须 `future.get()` 或 try-catch。

### 线程池参数动态调整

```java
// 核心线程数和最大线程数支持运行时动态修改（无需重启）
pool.setCorePoolSize(16);      // 动态扩容核心线程
pool.setMaximumPoolSize(32);   // 动态扩容最大线程

// 可以配合 Nacos 配置中心实现动态调参
@NacosValue(value = "${threadpool.coreSize:8}", autoRefreshed = true)
private int coreSize;

@NacosConfigListener(dataId = "app.yaml")
public void onConfigChange(String config) {
    pool.setCorePoolSize(newCoreSize);
    pool.setMaximumPoolSize(newMaxSize);
}
```

### 线程池监控（生产必备）

```java
// 定期打印线程池状态
ScheduledExecutorService monitor = Executors.newScheduledThreadPool(1);
monitor.scheduleAtFixedRate(() -> {
    log.info("线程池状态: active={}/{}, queue={}/{}, completed={}",
        pool.getActiveCount(),          // 当前活跃线程数
        pool.getPoolSize(),             // 当前总线程数
        pool.getQueue().size(),         // 队列中等待的任务数
        pool.getQueue().remainingCapacity(), // 队列剩余容量
        pool.getCompletedTaskCount()    // 已完成的任务总数
    );
}, 0, 10, TimeUnit.SECONDS);

// 关键告警指标：
// 1. 队列持续堆积 → 处理不过来，需要扩容或优化
// 2. activeCount 长期 = maximumPoolSize → 线程池打满，触发拒绝策略
// 3. 拒绝策略触发次数 → 需要扩容或降级
```

### 代码示例

```java
public class ThreadPoolDemo {
    public static void main(String[] args) {
        // 自定义线程池（阿里规范：不要用 Executors 工具类）
        ThreadPoolExecutor pool = new ThreadPoolExecutor(
            2,                              // 核心线程数
            4,                              // 最大线程数
            30, TimeUnit.SECONDS,           // 空闲存活时间
            new LinkedBlockingQueue<>(10),  // 任务队列容量 10
            new ThreadFactoryBuilder()      // Guava 的线程工厂
                .setNameFormat("biz-pool-%d")
                .build(),
            new ThreadPoolExecutor.CallerRunsPolicy()  // 拒绝策略
        );

        // 提交任务
        for (int i = 0; i < 20; i++) {
            final int taskId = i;
            pool.submit(() -> {
                System.out.println("任务 " + taskId + " 由 "
                    + Thread.currentThread().getName() + " 执行");
                try { Thread.sleep(1000); } catch (Exception e) {}
            });
        }

        pool.shutdown();

        // 面试题：为什么阿里禁止用 Executors.newFixedThreadPool()？
        // 因为 LinkedBlockingQueue 默认是 Integer.MAX_VALUE
        // 任务堆积会导致 OOM
        // newCachedThreadPool 最大线程数是 Integer.MAX_VALUE，也会 OOM
    }
}
```

### 项目实战场景：DAG 指标计算线程池设计（结合简历）

```java
// 简历项目三：DAG 指标计算引擎，用 CompletableFuture 做异步编排
// 实际生产中的线程池设计：

// 1. 计算线程池：CPU 密集型，核心数 + 1
ThreadPoolExecutor computePool = new ThreadPoolExecutor(
    Runtime.getRuntime().availableProcessors() + 1,  // 核心 = CPU 核数 + 1
    Runtime.getRuntime().availableProcessors() + 1,  // 最大 = 核心（不扩）
    0L, TimeUnit.MILLISECONDS,
    new LinkedBlockingQueue<>(500),
    new ThreadFactoryBuilder().setNameFormat("metric-compute-%d").build(),
    new ThreadPoolExecutor.AbortPolicy()
);

// 2. IO 线程池：查数据库/缓存，IO 密集型，核心数 * 2
ThreadPoolExecutor ioPool = new ThreadPoolExecutor(
    Runtime.getRuntime().availableProcessors() * 2,  // IO 密集，可以多一些
    Runtime.getRuntime().availableProcessors() * 4,  // 允许突发扩容
    60L, TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(1000),
    new ThreadFactoryBuilder().setNameFormat("metric-io-%d").build(),
    new ThreadPoolExecutor.CallerRunsPolicy()  // 满了让提交线程执行，自然限流
);

// 3. DAG 计算使用
CompletableFuture<MetricResult> future = CompletableFuture
    .supplyAsync(() -> queryDeviceData(deviceId), ioPool)       // IO 操作走 IO 池
    .thenApplyAsync(data -> calculateMetrics(data), computePool) // 计算走计算池
    .exceptionally(ex -> {
        log.error("指标计算失败: deviceId={}", deviceId, ex);
        return MetricResult.empty();
    });
```

### 面试题

**Q1：线程池的核心参数和执行流程？（超高频 ⭐⭐⭐⭐⭐）**

答：
1. 任务来了先看核心线程是否已满，没满就创建核心线程执行
2. 核心线程满了，放入任务队列
3. 队列也满了，看是否达到最大线程数，没满就创建非核心线程
4. 最大线程数也满了，执行拒绝策略

**Q2：为什么阿里禁止用 Executors 创建线程池？（高频 ⭐⭐⭐⭐⭐）**

答：
- `newFixedThreadPool` 和 `newSingleThreadExecutor`：队列是 `LinkedBlockingQueue`，默认容量 `Integer.MAX_VALUE`，可能堆积大量任务导致 OOM
- `newCachedThreadPool` 和 `newScheduledThreadPool`：最大线程数是 `Integer.MAX_VALUE`，可能创建大量线程导致 OOM
- 应该用 `ThreadPoolExecutor` 构造函数手动指定参数

**Q3：核心线程数怎么设置？（中频 ⭐⭐⭐⭐）**

答：
- **CPU 密集型**（计算多）：`核心数 + 1`，线程多了反而增加上下文切换
- **IO 密集型**（网络/数据库）：`核心数 * 2` 或 `核心数 / (1 - 阻塞系数)`，阻塞系数一般 0.8~0.9
- **混合型**：拆分成 CPU 密集和 IO 密集两个线程池

```java
// 获取 CPU 核心数
int cpuCores = Runtime.getRuntime().availableProcessors();
// CPU 密集型
ThreadPoolExecutor cpuPool = new ThreadPoolExecutor(
    cpuCores + 1, cpuCores + 1, 0L, TimeUnit.MILLISECONDS,
    new LinkedBlockingQueue<>(100));
// IO 密集型
ThreadPoolExecutor ioPool = new ThreadPoolExecutor(
    cpuCores * 2, cpuCores * 2, 30L, TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(500));
```

**Q4：核心线程能被回收吗？（低频 ⭐⭐）**

答：默认不能。但 `allowCoreThreadTimeOut(true)` 可以让核心线程在空闲超时后被回收。适用于低峰期节省资源的场景。

**Q5：submit() 和 execute() 有什么区别？（高频 ⭐⭐⭐⭐）**

答：三个核心区别：
1. **返回值**：execute() 无返回值，submit() 返回 Future
2. **异常处理**：execute() 的异常直接抛出（线程会销毁并补充新线程）；submit() 的异常被封装到 Future 中，不调 get() 就永远看不到——**这是生产环境最常见的坑**
3. **底层实现**：submit() 内部把 Runnable 包装成 FutureTask，最终还是调用 execute()

**Q6：线程池的队列怎么选？（高频 ⭐⭐⭐⭐）**

答：
- **大多数场景**：`LinkedBlockingQueue(capacity)` 有界队列——任务可以排队等待，队列满后才扩容线程，最后才触发拒绝策略，行为最可控
- **要求立即执行**：`SynchronousQueue`——任务不排队，直接给线程或创建新线程，适合不能容忍排队延迟的场景
- **绝对不要**：无界队列（默认 LinkedBlockingQueue）——maximumPoolSize 永远不生效，任务无限堆积最终 OOM

**Q7：shutdown() 和 shutdownNow() 的区别？（中频 ⭐⭐⭐）**

答：
- `shutdown()`：平滑关闭。不再接收新任务，但会把队列中的任务执行完，等所有任务完成后线程池才终止
- `shutdownNow()`：强制关闭。不再接收新任务，队列中的任务不执行了（作为返回值返回），正在执行的任务通过 interrupt 尝试中断
- 注意：shutdownNow() 的 interrupt 只是设置中断标志，如果任务没有响应中断（比如没有 sleep/wait），线程不会真正停止

**Q8：生产环境怎么做线程池监控和动态调参？（高频 ⭐⭐⭐⭐）**

答：
- **监控**：定时采集 `getActiveCount()`（活跃线程）、`getQueue().size()`（队列积压）、`getCompletedTaskCount()`（完成任务数），接入 Prometheus/Grafana 告警。关键告警：队列持续积压、活跃线程长期打满、拒绝策略触发次数上升
- **动态调参**：`setCorePoolSize()` 和 `setMaximumPoolSize()` 支持运行时修改，配合 Nacos 配置中心可以实现不重启动态调整。美团开源的 `dynamic-tp` 框架就是干这个的

**Q9：CompletableFuture 默认用什么线程池？有什么风险？（高频 ⭐⭐⭐⭐）**

答：
- 不传线程池时使用 `ForkJoinPool.commonPool()`，默认线程数 = CPU 核数 - 1
- 风险：所有不传线程池的 CompletableFuture 共享这个公共池，一个慢任务会阻塞其他所有任务
- 风险：commonPool 的线程是 daemon 线程，JVM 退出时不等任务完成
- **建议始终传入自定义线程池**，特别是 IO 密集型任务

---

## 2.6 CompletableFuture

### 小白讲解

**一句话**：CompletableFuture 是 Java 8 的异步编程利器，可以像写同步代码一样写异步逻辑。

```
传统方式：Future + 线程池
  Future<String> future = pool.submit(() -> queryDb());
  String result = future.get(); // 阻塞等待
  // 不能在完成后自动回调，不能链式操作

CompletableFuture：可以编排异步任务
  CompletableFuture.supplyAsync(() -> queryDb())       // 异步查 DB
      .thenApply(data -> process(data))                 // 查完后处理
      .thenCompose(processed -> saveToCache(processed)) // 处理完存缓存
      .thenAccept(saved -> log.info("done: {}", saved)) // 存完后记录日志
      .exceptionally(ex -> { log.error("出错", ex); return null; }); // 异常处理
```

**简历相关**：你的 DAG 指标计算流水线用了 CompletableFuture，面试官会问"怎么编排的"。

### 代码示例

```java
public class CompletableFutureDemo {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(4);

        // 场景：并行调用 3 个接口，汇总结果

        // 1. supplyAsync：异步执行有返回值
        CompletableFuture<String> userFuture = CompletableFuture
            .supplyAsync(() -> {
                sleep(500);
                return "用户信息";
            }, pool);

        CompletableFuture<String> orderFuture = CompletableFuture
            .supplyAsync(() -> {
                sleep(800);
                return "订单信息";
            }, pool);

        CompletableFuture<String> couponFuture = CompletableFuture
            .supplyAsync(() -> {
                sleep(300);
                return "优惠券信息";
            }, pool);

        // 2. allOf：等所有任务完成
        CompletableFuture<Void> allDone = CompletableFuture
            .allOf(userFuture, orderFuture, couponFuture);

        // 3. thenApply：完成后转换结果
        String result = allDone.thenApply(v ->
            userFuture.join() + " | " +
            orderFuture.join() + " | " +
            couponFuture.join()
        ).get();

        System.out.println(result);
        // 总耗时约 800ms（最慢的那个），而不是 500+800+300=1600ms

        // 其他常用方法：
        // thenAccept：消费结果，无返回值
        // thenCombine：合并两个 future 的结果
        // thenCompose：串联（类似 flatMap）
        // anyOf：任一完成即返回
        // exceptionally：异常处理
        // whenComplete：完成时回调（成功/失败都会执行）

        pool.shutdown();
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (Exception e) {}
    }
}
```

### 面试题

**Q1：CompletableFuture 和 Future 的区别？（高频 ⭐⭐⭐⭐）**

答：
| 对比项 | Future | CompletableFuture |
|--------|--------|-------------------|
| 主动完成 | 不能 | complete()/completeExceptionally() |
| 回调通知 | 不能，必须 get() 阻塞 | thenApply/thenAccept 等回调 |
| 链式编排 | 不能 | thenCompose/thenCombine |
| 组合多个 | 不能 | allOf/anyOf |
| 异常处理 | get() 抛 ExecutionException | exceptionally/whenComplete |

**Q2：supplyAsync 不传线程池会怎样？（中频 ⭐⭐⭐）**

答：默认用 `ForkJoinPool.commonPool()`，线程数为 CPU 核心数 - 1。问题：
1. 所有不传线程池的 CompletableFuture 共享这个池，容易互相阻塞
2. 适合 CPU 密集型，IO 密集型任务会打满线程
3. **建议始终传入自定义线程池**

---

## 2.7 ThreadLocal

### 小白讲解

**一句话**：ThreadLocal 给每个线程一份独立的变量副本，互不干扰。

```
生活类比：每个人有自己的水杯，不共用一个杯子喝水

ThreadLocal<String> threadLocal = new ThreadLocal<>();
  线程 A set("张三") → 线程 A 的 ThreadLocalMap 里存 "张三"
  线程 B set("李四") → 线程 B 的 ThreadLocalMap 里存 "李四"
  线程 A get() → "张三"
  线程 B get() → "李四"
```

**底层原理**：

```
每个 Thread 对象内部有一个 ThreadLocalMap
  Thread.threadLocals → ThreadLocalMap

ThreadLocalMap 的 key 是 ThreadLocal 对象（弱引用）
ThreadLocalMap 的 value 是实际存储的值（强引用）

set 流程：
  获取当前线程 → 获取线程的 ThreadLocalMap → 以 this（ThreadLocal）为 key 存入 value
```

### 代码示例

```java
public class ThreadLocalDemo {
    // 典型场景：存用户登录信息，全链路传递
    private static final ThreadLocal<UserContext> userContext =
        ThreadLocal.withInitial(() -> new UserContext("anonymous"));

    public static void main(String[] args) {
        // 线程 A
        new Thread(() -> {
            userContext.set(new UserContext("张三"));
            try {
                System.out.println("线程A读取：" + userContext.get().name); // 张三
                // 调用业务方法，不需要传参，直接从 ThreadLocal 取
                businessMethod();
            } finally {
                userContext.remove(); // 用完必须 remove！
            }
        }).start();

        // 线程 B
        new Thread(() -> {
            userContext.set(new UserContext("李四"));
            try {
                System.out.println("线程B读取：" + userContext.get().name); // 李四
                businessMethod();
            } finally {
                userContext.remove();
            }
        }).start();
    }

    static void businessMethod() {
        // 不需要传 UserContext 参数，直接从 ThreadLocal 取
        UserContext ctx = userContext.get();
        System.out.println("业务方法处理用户：" + ctx.name);
    }

    static class UserContext {
        String name;
        UserContext(String name) { this.name = name; }
    }
}
```

### 面试题

**Q1：ThreadLocal 的内存泄漏问题？（高频 ⭐⭐⭐⭐⭐）**

答：
```
Thread → ThreadLocalMap → Entry(key=WeakRef<ThreadLocal>, value=强引用)

如果 ThreadLocal 对象被回收（key=null），但 value 还在
  → Thread 一直存活 → value 无法回收 → 内存泄漏

在线程池场景下，线程会复用，如果不清除 ThreadLocal
  → 上一个任务的 value 残留 → 数据串号 + 内存泄漏

解决：每次用完在 finally 中调用 remove()
```

**Q2：ThreadLocal 的 key 为什么用弱引用？（中频 ⭐⭐⭐⭐）**

答：
- 如果用强引用：ThreadLocal 对象即使没有外部引用了，Thread 的 ThreadLocalMap 还持有它，无法回收 → 内存泄漏
- 用弱引用：ThreadLocal 对象只被 ThreadLocalMap 的弱引用指向时，GC 会回收它
- 但 value 是强引用，所以 key 被回收后 value 仍在 → 这就是为什么必须 remove()

**Q3：ThreadLocal 用在什么场景？（中频 ⭐⭐⭐）**

答：
1. **用户上下文传递**：登录信息、租户 ID，避免方法签名层层传参
2. **数据库连接管理**：Spring 的事务管理器用 ThreadLocal 绑定 Connection，保证同一线程用同一个连接
3. **链路追踪**：SkyWalking 用 ThreadLocal 传递 traceId
4. **日期格式化**：SimpleDateFormat 非线程安全，用 ThreadLocal 每个线程一份

---

# 第三章：JVM

> 简历写了"JVM调优、G1/ZGC"，面试官一定会问内存结构、GC 算法、类加载。

---

## 3.1 JVM 内存结构

### 小白讲解

```
JVM 内存结构（JDK 1.8+）

┌─────────────────────────────────────────────────────────┐
│                    JVM 进程内存                            │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────────────────┐│
│  │                  │  │         堆（Heap）             ││
│  │  方法区/元空间     │  │  ┌────────┬────────┐         ││
│  │  (Metaspace)     │  │  │  年轻代  │  老年代  │        ││
│  │                  │  │  │ Eden+S0+S1 │           │    ││
│  │  - 类信息         │  │  └────────┴────────┘         ││
│  │  - 常量池         │  │  所有对象实例+数组              ││
│  │  - 静态变量       │  │                              ││
│  └──────────────────┘  └──────────────────────────────┘│
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐│
│  │  虚拟机栈    │  │  本地方法栈  │  │  直接内存（NIO）    ││
│  │ (VM Stack)  │  │(Native Stack)│ │ (Direct Memory)   ││
│  │            │  │            │  │                    ││
│  │ 栈帧：      │  │ Native 方法 │  │ Buffer.allocate()  ││
│  │ - 局部变量表 │  │ 的调用栈    │  │ 不受 JVM 堆管理     ││
│  │ - 操作数栈   │  │            │  │                    ││
│  │ - 动态链接   │  │            │  │                    ││
│  │ - 返回地址   │  │            │  │                    ││
│  └────────────┘  └────────────┘  └────────────────────┘│
│                                                          │
│  ┌──────────────┐                                       │
│  │ 程序计数器 PC  │  ← 每个线程一个，记录当前执行的字节码行号    │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

**各区域的作用和特点**：

| 区域 | 线程共享？ | 存什么 | OOM 类型 |
|------|-----------|--------|---------|
| 堆 | 共享 | 对象实例、数组 | OutOfMemoryError: Java heap space |
| 方法区/元空间 | 共享 | 类信息、常量池、静态变量 | OOM: Metaspace |
| 虚拟机栈 | 私有 | 方法调用的栈帧 | StackOverflowError / OOM |
| 本地方法栈 | 私有 | Native 方法的栈帧 | 同上 |
| 程序计数器 | 私有 | 当前字节码地址 | 不会 OOM |
| 直接内存 | 共享 | NIO 的 DirectByteBuffer | OOM: Direct buffer memory |

### 面试题

**Q1：描述 JVM 内存结构？（高频 ⭐⭐⭐⭐⭐）**

答：JVM 内存分为 5 块（JDK 1.8+）：
1. **堆**：所有对象实例和数组，GC 主战场。分为年轻代（Eden + S0 + S1）和老年代
2. **元空间**（替代永久代）：类信息、常量池、静态变量。使用本地内存
3. **虚拟机栈**：每个方法调用创建一个栈帧（局部变量表 + 操作数栈 + 动态链接 + 返回地址）
4. **本地方法栈**：为 Native 方法服务
5. **程序计数器**：记录当前线程执行的字节码行号

**Q2：JDK 1.8 为什么要用元空间替换永久代？（高频 ⭐⭐⭐⭐）**

答：
1. 永久代大小固定（`-XX:MaxPermSize`），容易 OOM；元空间用本地内存，大小受限于物理内存
2. 永久代的 GC 效率低，Full GC 时才回收；元空间改进了类卸载机制
3. 方便 JRockit 和 HotSpot 融合（JRockit 没有永久代）

**Q3：对象一定分配在堆上吗？（中频 ⭐⭐⭐⭐）**

答：不一定。JVM 有"逃逸分析"优化：
- 对象只在方法内部使用（未逃逸）→ 可分配在栈上（栈上分配），方法结束自动释放
- 可以标量替换：把对象拆成基本类型，直接用局部变量
- 目的是减少 GC 压力

---

## 3.2 垃圾回收（GC）

### 小白讲解

**3 个核心问题：什么对象该回收？怎么回收？什么时候回收？**

**1. 什么对象该回收？—— 可达性分析**

```
从 GC Roots 开始遍历对象引用链
  能遍历到的 → 存活
  遍历不到的 → 垃圾

GC Roots 包括：
  - 虚拟机栈中的局部变量
  - 方法区的静态变量
  - 方法区的常量
  - 本地方法栈中的 JNI 引用
  - 活跃线程
  - 同步锁持有的对象
```

**2. 怎么回收？—— GC 算法**

```
标记-清除（Mark-Sweep）：
  标记垃圾 → 直接清除
  缺点：内存碎片

复制（Copying）：
  内存分两半，存活对象复制到另一半，清空原来的
  缺点：浪费一半空间
  用于：年轻代（Eden + Survivor）

标记-整理（Mark-Compact）：
  标记垃圾 → 存活对象向一端移动 → 清理边界外的
  优点：无碎片
  用于：老年代
```

**3. 什么时候回收？—— 分代回收**

```
年轻代（Eden : S0 : S1 = 8 : 1 : 1）
  新对象先分配在 Eden
  Eden 满 → Minor GC：
    Eden 存活对象 + S0 存活对象 → 复制到 S1
    清空 Eden + S0
    S0 和 S1 交换角色
  每经历一次 GC，年龄 +1
  年龄 ≥ 15（默认）→ 晋升到老年代

老年代
  存放长期存活的对象和大对象
  老年代满 → Major GC / Full GC
  Full GC 比 Minor GC 慢 10 倍以上
```

**4. 垃圾回收器对比**

| 回收器 | 年轻代 | 老年代 | 特点 | 适用场景 |
|--------|--------|--------|------|---------|
| Serial | 复制 | 标记整理 | 单线程，STW | 客户端/小应用 |
| Parallel Scavenge | 复制 | 标记整理 | 多线程，吞吐量优先 | 后台计算 |
| CMS | ParNew | 标记清除 | 低延迟，并发标记 | 对延迟敏感（已废弃）|
| **G1** | 分区 | 分区 | 可预测停顿，Region 化 | 大堆内存（简历写了）|
| **ZGC** | 分区 | 分区 | 着色指针，<10ms 停顿 | 超大堆（简历写了）|

---

## 3.3 G1 垃圾收集器详解

### 为什么需要 G1？

```
CMS 的痛点：
  1. 内存碎片严重 → 大对象无法分配 → 提前触发 Full GC（Serial Old 单线程整理，停顿几秒）
  2. 停顿时间不可控 → 堆越大，Full GC 越慢
  3. 无法设置停顿目标 → 运维只能祈祷

G1 的设计目标：
  "在可控的停顿时间内，尽可能多地回收垃圾"
  → 可以设置 -XX:MaxGCPauseMillis=200（目标停顿 200ms）
  → G1 会根据这个目标，选择最有价值的 Region 优先回收
```

### Region：G1 的核心创新

```
传统 GC（CMS/Parallel）：
  堆 = 连续的年轻代 + 连续的老年代（物理上固定划分）

G1：
  堆 = 最多 2048 个 Region（每个 1~32MB，必须是 2 的幂）
  每个 Region 可以是 Eden、Survivor、Old、Humongous 中的任意一种
  Region 的角色是动态的，不再是物理固定

Region 类型：
  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
  │ Eden │ Eden │  S0  │ Old  │ Old  │Humong│ Free │ Free │  ← 物理上离散
  │(2MB) │(2MB) │(2MB) │(2MB) │(2MB) │(4MB) │(2MB) │(2MB) │
  └──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘

  Humongous Region：存大对象（超过 Region 容量 50% 的对象）
  一个 Humongous 对象可能占多个连续 Region
```

### G1 的 Young GC（Minor GC）

```
触发条件：Eden Region 占满

过程（全部 STW）：
  1. 扫描 GC Roots
  2. 处理 Remembered Set（找到老年代→年轻代的引用）
  3. 将 Eden + Survivor 中的存活对象复制到新的 Survivor Region
  4. 年龄达标的对象晋升到 Old Region
  5. 清空 Eden Region 和旧 Survivor Region

特点：
  - 整个 Young GC 都是 STW 的，但很快（因为只处理年轻代 Region）
  - 通过 Remembered Set 避免扫描整个老年代
```

### Remembered Set（RSet）：G1 的关键数据结构

```
问题：Young GC 时需要找到老年代对象引用了哪些年轻代对象
       如果扫描整个老年代 → 太慢

解决：每个 Region 维护一个 RSet
       RSet 记录了"哪些其他 Region 的对象引用了我"

       例如：Old Region A 的某个对象引用了 Eden Region B 的对象
             → Region B 的 RSet 记录 "Region A 引用了我"

       Young GC 时：
         只需扫描 Eden Region 的 RSet 中的 Old Region
         不需要扫描所有 Old Region

底层实现：
  RSet 基于 Card Table（卡表）
  把堆分成 512 字节的 Card（卡片）
  如果 Card 中有对象被修改（写屏障），标记为 Dirty
  GC 时只扫描 Dirty Card 对应的老年代区域

写屏障（Write Barrier）：
  每次给引用类型字段赋值时，JVM 插入一段额外代码
  记录这个修改到 Card Table
  代价：每次写操作多几条指令（性能开销约 5%~10%）
```

### G1 的 Mixed GC（混合回收）

```
触发条件：老年代占用达到阈值（默认整堆的 45%，-XX:InitiatingHeapOccupancyPercent）

过程（4 个阶段）：

  阶段1：初始标记（Initial Mark，STW）
    - 标记 GC Roots 直接可达的对象
    - 借用 Young GC 的 STW 完成（piggyback）
    - 很快，通常 < 5ms

  阶段2：并发标记（Concurrent Marking，非 STW）
    - 从 GC Roots 开始遍历整个堆的对象图
    - 与应用线程并发执行
    - 使用 SATB（Snapshot-At-The-Beginning）算法保证正确性
    - 耗时较长，但不影响应用

  阶段3：最终标记（Remark，STW）
    - 处理并发标记期间应用线程造成的引用变更
    - 使用 SATB 的写屏障记录的变更日志
    - 通常几十毫秒

  阶段4：筛选回收（Cleanup / Evacuation，STW）
    - 统计每个 Region 的垃圾比例和回收价值
    - 优先回收垃圾最多的 Region（Garbage First 名字的由来）
    - 回收方式：把存活对象复制到空 Region，然后整体清空旧 Region
    - 这一步决定停顿时间是否达标（MaxGCPauseMillis）

SATB（Snapshot-At-The-Beginning）：
  在并发标记开始时，给对象图拍一个"快照"
  标记过程只处理快照中的引用关系
  并发期间新分配的对象直接标记为存活（不处理）
  并发期间引用变更通过写屏障记录到 SATB Buffer
  最终标记阶段统一处理 SATB Buffer 中的变更
```

### G1 的 Full GC（要尽量避免）

```
触发条件：
  1. Mixed GC 回收速度跟不上对象分配速度 → 老年代被占满
  2. Humongous 对象分配失败（找不到连续 Region）
  3. 元空间不足

Full GC 的行为：
  G1 的 Full GC 是单线程的（JDK 9 及以前）
  JDK 10+ 改为多线程（Parallel Full GC）
  停顿时间可能是秒级甚至十几秒

如何避免：
  1. 增大堆内存
  2. 提前触发 Mixed GC（降低 IHOP 阈值）
  3. 增加并发标记线程数（-XX:ConcGCThreads）
  4. 避免大对象（Humongous 分配）
```

### G1 常用参数

```bash
# 启用 G1
-XX:+UseG1GC

# 目标最大停顿时间（默认 200ms）
-XX:MaxGCPauseMillis=200

# Region 大小（默认自动计算，范围 1MB~32MB，必须是 2 的幂）
-XX:G1HeapRegionSize=4m

# 触发 Mixed GC 的老年代占用阈值（默认 45%）
-XX:InitiatingHeapOccupancyPercent=40

# 并发标记阶段的 GC 线程数
-XX:ConcGCThreads=4

# STW 阶段的 GC 线程数
-XX:ParallelGCThreads=8

# G1 保留的空闲 Region 比例（防止晋升失败，默认 10%）
-XX:G1ReservePercent=15

# 打印 GC 日志
-Xlog:gc*:file=gc.log:time,level,tags
```

### G1 面试题

**Q1：G1 的 Region 是怎么设计的？为什么要用 Region？（高频 ⭐⭐⭐⭐⭐）**

答：
- G1 把堆划分为最多 2048 个大小相等的 Region（每个 1~32MB），不再是物理上连续的年轻代和老年代
- 每个 Region 可以动态扮演 Eden、Survivor、Old、Humongous 角色
- 好处：
  1. **可预测停顿**：G1 可以精确计算每个 Region 的回收价值和回收耗时，在 MaxGCPauseMillis 约束下选择最有价值的 Region 组合进行回收
  2. **无碎片**：回收时把存活对象复制到空 Region，然后整体释放旧 Region，相当于整体是复制算法
  3. **灵活**：Region 大小可调（-XX:G1HeapRegionSize），适应不同大小的堆

**Q2：G1 的 Young GC 和 Mixed GC 有什么区别？（高频 ⭐⭐⭐⭐⭐）**

| 对比项 | Young GC | Mixed GC |
|--------|----------|----------|
| 回收范围 | 只回收年轻代 Region | 年轻代 + 部分老年代 Region |
| 触发条件 | Eden 满 | 老年代达到 IHOP 阈值（默认 45%） |
| 标记方式 | 全 STW，利用 RSet 快速定位 | 并发标记（SATB）+ STW 筛选 |
| 停顿时间 | 短（通常 < 50ms） | 取决于回收的 Region 数量 |
| 频率 | 高 | 低 |

**Q3：什么是 Remembered Set？解决什么问题？（高频 ⭐⭐⭐⭐）**

答：
- **问题**：Young GC 需要找到老年代对象引用了哪些年轻代对象（跨代引用），如果扫描整个老年代太慢
- **方案**：每个 Region 维护一个 RSet，记录"哪些其他 Region 的对象引用了我"
- **实现**：基于 Card Table + 写屏障。每次修改引用字段时，写屏障将对应 Card 标记为 Dirty，GC 时只扫描 Dirty Card
- **代价**：写屏障带来约 5%~10% 的性能开销，但远小于扫描整个老年代

**Q4：G1 的 SATB 算法是什么？（中频 ⭐⭐⭐）**

答：
- SATB（Snapshot-At-The-Beginning）是 G1 并发标记的核心算法
- 在并发标记开始时，对对象图拍一个"逻辑快照"
- 标记过程只处理快照中的引用关系，并发期间新创建的对象直接视为存活
- 并发期间的引用变更通过写屏障记录到 SATB Buffer
- 最终标记（Remark）阶段统一处理 Buffer 中的变更
- 对比 CMS 的增量更新（Incremental Update）：SATB 的 Remark 阶段更快，因为只需要处理 Buffer 中的变更，不需要重新扫描

**Q5：G1 什么时候会触发 Full GC？怎么避免？（高频 ⭐⭐⭐⭐）**

答：
- 触发场景：
  1. Mixed GC 回收速度跟不上对象分配速度 → 老年代被占满（Evacuation Failure）
  2. Humongous 对象分配失败（找不到连续空闲 Region）
  3. 元空间不足触发
- 避免措施：
  1. 增大堆内存
  2. 降低 IHOP 阈值让 Mixed GC 更早触发
  3. 增加并发标记线程（-XX:ConcGCThreads）加速标记
  4. 避免创建大对象（超过 Region 50% 的对象）
  5. 增大 G1ReservePercent 预留更多空闲 Region

**Q6：G1 和 CMS 的核心区别？（高频 ⭐⭐⭐⭐⭐）**

| 对比项 | CMS | G1 |
|--------|-----|-----|
| 算法 | 标记-清除 | 标记-复制 + 标记-整理 |
| 内存划分 | 物理分代（连续年轻代/老年代） | Region 逻辑分代（离散） |
| 碎片 | 有碎片，需定期 Full GC 整理 | 无碎片（Region 级复制） |
| 停顿控制 | 不可预测 | 可设目标停顿时间 |
| 并发标记 | 增量更新 | SATB 快照 |
| 跨代引用 | Card Table | Remembered Set（更强） |
| 堆大小 | < 8GB | 6GB+ |
| Full GC | 单线程 Serial Old | JDK 10+ 多线程 |
| 状态 | JDK 9 废弃 | JDK 9+ 默认 |

---

## 3.4 ZGC 垃圾收集器详解

### 为什么需要 ZGC？

```
G1 的局限：
  - 停顿时间目标 200ms，实际可能 50~300ms
  - 堆越大，停顿越长（扫描和复制的工作量与堆大小成正比）
  - TB 级堆 → 停顿不可接受

ZGC 的设计目标：
  - 停顿时间 < 10ms（无论堆多大，4GB 还是 4TB）
  - 停顿时间不与堆大小成正比
  - 支持 TB 级堆内存

核心思路：
  "把最耗时的操作全部并发化，STW 只做最少量的事"
  → 标记、转移、重映射全部并发执行
  → STW 只做：初始标记（几个 GC Roots）、最终转移前的准备
```

### 着色指针（Colored Pointers）：ZGC 的核心创新

```
传统 GC：对象头中存储 GC 标记信息（Mark Word）
  → 需要修改对象头 → 需要 STW 或写屏障

ZGC：直接在指针中嵌入 GC 标记信息
  64 位指针中只有 44 位用于寻址（支持 16TB 内存）
  剩余 20 位中的 4 位用于 GC 标记：

  ┌──────────────────────────────────────────────────────────┐
  │ 63    44  43   42   41   40   39                        0 │
  │ 未使用  │ M1 │ M0 │ R  │ F  │      对象地址（44位）      │
  └──────────────────────────────────────────────────────────┘

  M0/M1 (Marked0/Marked1)：标记阶段使用，标识对象是否存活
  R (Remapped)：重映射阶段使用，标识指针是否已指向新地址
  F (Finalizable)：标识对象是否只能通过 Finalizer 访问

好处：
  - 不需要修改对象头 → 标记和转移可以并发
  - 读指针时就能知道对象的 GC 状态 → 读屏障自动处理
```

### 读屏障（Load Barrier）：ZGC 的关键机制

```
传统 GC 的写屏障：在写引用时插入额外代码（记录 Card Table）
ZGC 的读屏障：在读引用时插入额外代码

每次从堆中读取一个对象引用时，JVM 会：
  1. 检查指针的标记位（M0/M1/R/F）
  2. 如果指针是"好的"（已标记、已重映射）→ 直接使用
  3. 如果指针是"坏的"（未标记、需要重映射）→ 自动修正
     - 标记阶段：把对象加入标记队列，修正指针标记
     - 转移阶段：查转发表（Forwarding Table），获取新地址，更新指针

读屏障的伪代码：
  Object readBarrier(Object* ptr) {
      if (isGoodPtr(ptr)) {
          return *ptr;  // 直接使用，无额外开销
      } else {
          return slowPath(ptr);  // 修正指针
      }
  }

性能影响：
  - 大部分读操作是"好的指针" → 只需一次位运算检查
  - 实测性能开销约 5%~15%
  - 但换来了 < 10ms 的 STW 停顿
```

### ZGC 的 4 个阶段

```
┌─────────────────────────────────────────────────────────┐
│                     ZGC 完整 GC 周期                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  阶段1：初始标记（STW，< 1ms）                             │
│    - 标记 GC Roots 直接引用的对象                          │
│    - 只扫描几十个 GC Roots，所以极快                        │
│                                                          │
│  阶段2：并发标记（非 STW，耗时与堆大小成正比）                │
│    - 从 GC Roots 遍历整个对象图                            │
│    - 使用 M0/M1 标记位标识存活对象                          │
│    - 读屏障自动处理应用线程的并发修改                        │
│    - 与应用线程并发执行，不影响业务                         │
│                                                          │
│  阶段3：再标记（STW，< 1ms）                               │
│    - 处理并发标记期间的引用变更                             │
│    - 完成最后的标记工作                                    │
│    - 决定哪些 Region 需要回收                              │
│                                                          │
│  阶段4：并发转移（非 STW）                                  │
│    ├─ 初始转移（STW，< 1ms）：转移少量 GC Roots 直接引用的对象│
│    └─ 并发转移（非 STW）：                                   │
│        - 把存活对象从旧 Region 移动到新 Region              │
│        - 旧 Region 中的对象通过转发表（Forwarding Table）     │
│          记录旧地址→新地址的映射                             │
│        - 应用线程读到旧地址时，读屏障自动查转发表获取新地址    │
│        - 旧 Region 清空后可以立即复用                        │
│                                                          │
│  总 STW 时间：初始标记 + 再标记 + 初始转移 ≈ < 10ms         │
│  总耗时：并发标记 + 并发转移，与堆大小成正比                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 转发表（Forwarding Table）

```
对象从旧地址转移到新地址后，旧 Region 中保留一个转发表：
  旧地址 → 新地址

应用线程通过读屏障访问旧地址时：
  1. 发现指针指向已转移的 Region
  2. 查转发表获取新地址
  3. 更新指针指向新地址（自愈）
  4. 返回新地址的对象

当所有指向旧 Region 的指针都被修正后：
  → 转发表可以删除
  → 旧 Region 可以完全回收

这个过程叫"重映射"（Remapping）
```

### ZGC vs G1 对比

| 对比项 | G1 | ZGC |
|--------|-----|-----|
| 停顿目标 | 200ms（可配） | < 10ms |
| 停顿与堆大小 | 成正比 | 几乎无关 |
| 最大堆 | ~32GB 推荐 | ~16TB |
| 并发能力 | 部分并发（标记并发，回收 STW） | 几乎全并发（标记+转移都并发） |
| 标记方式 | 修改对象头 + SATB | 着色指针 + 读屏障 |
| 内存碎片 | 无碎片（Region 复制） | 无碎片（Region 转移） |
| 吞吐量损失 | ~10% | ~15% |
| 适用 JDK | 9+ | 11+（15 转正） |
| 适用场景 | 大堆 + 可接受百毫秒停顿 | 超大堆 + 极低延迟 |

### ZGC 常用参数

```bash
# 启用 ZGC（JDK 15+ 正式可用）
-XX:+UseZGC

# JDK 17+ 推荐启用分代 ZGC（Generational ZGC）
-XX:+UseZGC -XX:+ZGenerational

# 堆大小（ZGC 支持 TB 级）
-Xmx16g

# GC 线程数
-XX:ConcGCThreads=4

# 打印 GC 日志
-Xlog:gc*:file=zgc.log:time,level,tags
```

### ZGC 面试题

**Q1：ZGC 为什么能做到 < 10ms 停顿？（高频 ⭐⭐⭐⭐⭐）**

答：三大核心技术：
1. **着色指针**：把 GC 标记信息直接嵌入 64 位指针中（M0/M1/R/F 四个标记位），不需要修改对象头。标记和转移时可以并发读取指针状态，不需要 STW
2. **读屏障**：每次读取对象引用时，自动检查指针标记位。如果是"坏指针"（需要标记或重映射），读屏障自动修正。大部分读操作只需一次位运算，开销极小
3. **并发转移**：对象的移动和重映射都与应用线程并发执行。STW 只做初始标记（扫描 GC Roots）和再标记（处理并发变更），这两个操作与堆大小无关，所以停顿时间与堆大小无关

**Q2：ZGC 的着色指针和 G1 的 SATB 有什么区别？（中频 ⭐⭐⭐）**

| 对比项 | G1 SATB | ZGC 着色指针 |
|--------|---------|------------|
| 标记位置 | 对象头（Mark Word） | 指针本身（64 位中的 4 位） |
| 并发标记 | 需要写屏障 + SATB Buffer | 需要读屏障 |
| 并发转移 | 不支持（回收时 STW） | 支持（读屏障 + 转发表） |
| 额外内存 | SATB Buffer | 转发表（Forwarding Table） |
| 性能开销 | ~10% | ~15% |

**Q3：ZGC 的读屏障是怎么工作的？（高频 ⭐⭐⭐⭐）**

答：
1. 每次从堆中读取对象引用时，JVM 插入读屏障代码
2. 检查指针的标记位（M0/M1/R/F），判断指针是否"好的"
3. 好的指针：直接使用（约 99% 的情况，开销极小）
4. 坏的指针分两种：
   - 标记阶段：对象未被标记 → 加入标记队列，修正标记位
   - 转移阶段：对象已移动 → 查转发表获取新地址，更新指针（自愈）
5. 修正后下次再读同一个指针就是"好的"了，不会重复修正

**Q4：ZGC 有什么缺点？（中频 ⭐⭐⭐）**

答：
1. **吞吐量损失**：读屏障带来约 10%~15% 的吞吐量下降，对 CPU 敏感的应用有影响
2. **内存开销**：转发表需要额外内存；多重映射（multi-mapping）技术会使内存使用率略高于 G1
3. **不支持分代**（JDK 15-20）：早期 ZGC 是单代的，无法利用分代假设优化，导致 GC 频率较高。JDK 21 引入了分代 ZGC（Generational ZGC）解决这个问题
4. **不适合小堆**：4GB 以下的堆用 G1 或 Parallel 更划算，ZGC 的优势在大堆才体现
5. **JDK 版本要求**：JDK 15 才正式可用，JDK 17+ 才推荐生产使用

**Q5：G1 和 ZGC 怎么选？（高频 ⭐⭐⭐⭐）**

答：
- **堆 < 8GB**：用 G1，停顿时间已经够低（< 100ms），ZGC 的优势发挥不出来
- **堆 8~32GB**：用 G1，设置 MaxGCPauseMillis=200 能满足大多数低延迟需求
- **堆 > 32GB 或延迟要求 < 10ms**：用 ZGC，停顿时间与堆大小无关，TB 级堆也能保持低延迟
- **JDK 17+ 且堆 > 32GB**：用分代 ZGC（Generational ZGC），兼顾低停顿和高吞吐
- 实际项目：简历写了 G1/ZGC，面试时重点讲 G1（用得多），ZGC 讲原理即可

---

## 3.3 类加载机制

### 小白讲解

**类加载的 5 个阶段**：

```
加载 → 验证 → 准备 → 解析 → 初始化
 │                                    │
 └────── 使用 ────── 卸载 ────────────┘

1. 加载：把 .class 文件读入内存，生成 Class 对象
2. 验证：检查字节码格式、元数据、符号引用等
3. 准备：为静态变量分配内存并赋默认值（0/null）
        注意：static int x = 10; 此时 x=0
4. 解析：符号引用 → 直接引用
5. 初始化：执行 <clinit>() 方法，给静态变量赋实际值
           static int x = 10; 此时 x=10
```

**双亲委派模型**：

```
        BootstrapClassLoader（加载 rt.jar，Java 核心类）
                ↑
        ExtClassLoader（加载 ext/*.jar，扩展类）
                ↑
        AppClassLoader（加载 classpath，应用类）
                ↑
        自定义 ClassLoader

收到类加载请求时：
  1. 先委托给父加载器
  2. 父加载器加载不了，自己才加载

为什么？
  - 安全：防止用户写一个 java.lang.String 替代核心类
  - 唯一性：同一个类只会被加载一次
```

### 代码示例

```java
public class ClassLoaderDemo {
    public static void main(String[] args) {
        // 查看类的加载器
        System.out.println("String 的加载器: "
            + String.class.getClassLoader());
        // null → BootstrapClassLoader（C++ 实现，Java 层拿不到）

        System.out.println("当前类的加载器: "
            + ClassLoaderDemo.class.getClassLoader());
        // sun.misc.Launcher$AppClassLoader

        System.out.println("AppClassLoader 的父加载器: "
            + ClassLoaderDemo.class.getClassLoader().getParent());
        // sun.misc.Launcher$ExtClassLoader

        // 面试题：能自己写一个 java.lang.String 吗？
        // 不能。双亲委派会先让 BootstrapClassLoader 加载核心的 String
        // 如果自定义 ClassLoader 重写 loadClass 绕过双亲委派
        // → JVM 会报 SecurityException（核心包名受保护）

        // Tomcat 打破了双亲委派：
        // 每个 WebApp 有自己的 ClassLoader，优先加载自己的类
        // 原因：不同应用可能依赖同一个库的不同版本
    }
}
```

### 面试题

**Q1：什么是双亲委派模型？为什么这样设计？（高频 ⭐⭐⭐⭐⭐）**

答：
- **机制**：类加载请求先委托给父加载器处理，父加载器处理不了才自己加载
- **目的**：
  1. 安全性：防止核心类被篡改（用户写的 `java.lang.String` 不会被加载）
  2. 唯一性：保证同一个类在 JVM 中只有一份（用 ClassLoader + 类全限定名做唯一标识）
  3. 层次清晰：核心类由 Bootstrap 加载，扩展类由 Ext 加载，应用类由 App 加载

**Q2：哪些场景打破了双亲委派？（中频 ⭐⭐⭐⭐）**

答：
1. **Tomcat**：每个 Web 应用一个 WebAppClassLoader，优先加载自己 WEB-INF/classes 的类（不同应用可能依赖同一个库的不同版本）
2. **SPI 机制**：JDBC 的 `DriverManager` 由 BootstrapClassLoader 加载，但具体驱动实现在 classpath 下。用 `Thread.getContextClassLoader()` 打破
3. **OSGi**：模块化加载，网状结构而非树状
4. **热部署**：JRebel 等，创建新的 ClassLoader 加载新版本类

---

## 3.4 JVM 调优

### 常用参数

```bash
# 堆大小
-Xms4g          # 初始堆大小（建议和 Xmx 一样，避免动态扩容）
-Xmx4g          # 最大堆大小
-Xmn2g          # 年轻代大小
-XX:MetaspaceSize=256m    # 元空间初始大小
-XX:MaxMetaspaceSize=512m # 元空间最大大小

# GC 选型
-XX:+UseG1GC                # 使用 G1
-XX:MaxGCPauseMillis=200    # G1 目标停顿时间
-XX:+UseZGC                 # 使用 ZGC（JDK 15+）

# GC 日志
-Xlog:gc*:file=gc.log:time,uptime,level:filecount=10,filesize=50M  # JDK 9+

# 诊断
-XX:+HeapDumpOnOutOfMemoryError      # OOM 时自动 dump
-XX:HeapDumpPath=/tmp/heapdump.hprof
```

### 面试题

**Q1：线上 OOM 怎么排查？（高频 ⭐⭐⭐⭐⭐）**

答：
1. **事前配置**：`-XX:+HeapDumpOnOutOfMemoryError` 让 OOM 时自动生成 dump 文件
2. **事后排查**：
   - `jps` 找到 Java 进程 PID
   - `jmap -dump:format=b,file=heap.hprof <pid>` 导出堆快照
   - 用 MAT (Memory Analyzer Tool) 或 VisualVM 分析 hprof 文件
   - 找到占用内存最大的对象 → 查看引用链 → 定位代码
3. **常见原因**：
   - 大量数据加载到内存（如一次查 100 万条记录）
   - 静态集合无限增长（Map/List 只 put 不 remove）
   - ThreadLocal 未 remove（线程池场景）
   - 内存泄漏（监听器未注销、连接未关闭）
4. **在线诊断**：用 Arthas 的 `dashboard` / `heapdump` / `thread` 命令

**Q2：线上 CPU 100% 怎么排查？（高频 ⭐⭐⭐⭐⭐）**

答：
```bash
# 1. 找到 CPU 最高的 Java 进程
top

# 2. 找到该进程中 CPU 最高的线程
top -Hp <pid>

# 3. 将线程 PID 转为十六进制
printf "%x\n" <thread_pid>

# 4. 用 jstack 导出线程栈
jstack <pid> | grep -A 30 <hex_pid>

# 5. 看堆栈定位到代码行
```
或者直接用 Arthas：
```bash
arthas → thread -n 3  # 直接显示 CPU 最高的 3 个线程
```

---

# 第四章：Java 基础高频考点

---

## 4.1 String

### 小白讲解

```
String 不可变的原因：
1. 安全性：String 用作 HashMap 的 key、类加载器加载类名、数据库 URL
   如果可变，改了之后 HashMap 找不到值、加载错类
2. 线程安全：不可变天然线程安全，不需要同步
3. 字符串常量池：不可变才能共享，节省内存
   String s1 = "abc"; String s2 = "abc"; → 指向常量池同一个对象
4. hashCode 缓存：不可变所以 hashCode 只需算一次

String vs StringBuilder vs StringBuffer
  String：不可变，每次拼接都创建新对象
  StringBuilder：可变，非线程安全，性能最好
  StringBuffer：可变，线程安全（synchronized），性能略低
```

### 面试题

**Q1：String s = new String("abc") 创建了几个对象？（高频 ⭐⭐⭐⭐）**

答：
- 如果常量池没有 "abc"：创建 2 个对象。一个在堆（new 出来的），一个在常量池
- 如果常量池已有 "abc"：创建 1 个对象（只在堆中）

**Q2：String 的 equals() 和 == 的区别？（高频 ⭐⭐⭐）**

答：
- `==` 比较引用地址（是否是同一个对象）
- `equals()` 比较内容（字符序列是否相同）
- `intern()` 方法：返回常量池中的引用。`s.intern()` 如果常量池有则返回，没有则放入并返回

---

## 4.2 泛型

### 面试题

**Q1：什么是类型擦除？（中频 ⭐⭐⭐⭐）**

答：Java 泛型是编译期的语法糖，运行时没有泛型信息。
```java
List<String> list1 = new ArrayList<>();
List<Integer> list2 = new ArrayList<>();
// 运行时 list1.getClass() == list2.getClass() → 都是 ArrayList.class
```
- 编译后 `List<String>` 和 `List<Integer>` 都变成 `List`（原始类型）
- 泛型参数 `<T extends Number>` 擦除后用 Number 代替
- `<T>` 擦除后用 Object 代替

**Q2：泛型通配符 `?`、`extends`、`super` 的区别？（中频 ⭐⭐⡡）**

答：
- `List<?>`：未知类型，只能读不能写（除了 null）
- `List<? extends Number>`：上界，可以读 Number，不能写（不确定具体子类型）
- `List<? super Number>`：下界，可以写 Number 及其子类，读出来是 Object

**PECS 原则**：Producer Extends, Consumer Super
- 频繁读取用 `extends`
- 频繁插入用 `super`

---

## 4.3 反射与动态代理

### 小白讲解

```
反射：在运行时动态获取类信息、调用方法、访问字段

动态代理：在不修改源码的情况下，在运行时为目标对象创建代理
  JDK 动态代理：基于接口（目标类必须实现接口）
  CGLIB 动态代理：基于继承（生成子类，不能代理 final 类/方法）
```

### 代码示例

```java
public class ReflectionDemo {
    public static void main(String[] args) throws Exception {
        // 反射获取类信息
        Class<?> clazz = Class.forName("java.lang.String");

        // 创建实例
        Object str = clazz.getDeclaredConstructor(String.class)
                         .newInstance("hello");

        // 调用方法
        Method lengthMethod = clazz.getMethod("length");
        int len = (int) lengthMethod.invoke(str);
        System.out.println("length: " + len); // 5

        // JDK 动态代理
        UserService target = new UserServiceImpl();
        UserService proxy = (UserService) Proxy.newProxyInstance(
            target.getClass().getClassLoader(),
            target.getClass().getInterfaces(),
            (proxyObj, method, args1) -> {
                System.out.println("前置：记录日志");
                Object result = method.invoke(target, args1);
                System.out.println("后置：记录耗时");
                return result;
            }
        );
        proxy.findById(1);
        // 输出：
        // 前置：记录日志
        // UserServiceImpl findById: 1
        // 后置：记录耗时

        // Spring AOP 的底层就是动态代理：
        // 目标类有接口 → JDK 动态代理
        // 目标类无接口 → CGLIB 动态代理
    }
}

interface UserService { Object findById(Long id); }
class UserServiceImpl implements UserService {
    public Object findById(Long id) {
        System.out.println("UserServiceImpl findById: " + id);
        return new Object();
    }
}
```

### 面试题

**Q1：JDK 动态代理和 CGLIB 的区别？（高频 ⭐⭐⭐⭐）**

| 对比项 | JDK 动态代理 | CGLIB |
|--------|-------------|-------|
| 原理 | 接口 + 反射 | 继承 + ASM 字节码生成 |
| 要求 | 目标类必须实现接口 | 不需要接口，不能是 final 类 |
| 性能 | 创建快，调用稍慢 | 创建慢，调用快 |
| Spring AOP | 有接口时默认用 | 无接口时用 |

---

## 4.4 异常体系

```
Throwable
├── Error（不该 catch）
│   ├── OutOfMemoryError
│   ├── StackOverflowError
│   └── VirtualMachineError
└── Exception
    ├── RuntimeException（非受检，编译器不强制处理）
    │   ├── NullPointerException
    │   ├── ClassCastException
    │   ├── ArrayIndexOutOfBoundsException
    │   └── IllegalArgumentException
    └── 其他 Exception（受检，编译器强制 try-catch 或 throws）
        ├── IOException
        ├── SQLException
        └── ClassNotFoundException
```

### 面试题

**Q1：checked 和 unchecked 异常的区别？（中频 ⭐⭐⡡）**

答：
- **checked exception**：继承 Exception 但非 RuntimeException。编译器强制处理（try-catch 或 throws）。如 IOException、SQLException
- **unchecked exception**：继承 RuntimeException。编译器不强制处理。如 NPE、IllegalArgumentException

**Q2：try-catch-finally 的执行顺序？（高频 ⭐⭐⭐⭐）**

答：
1. try 正常 → finally 执行 → 返回 try 的值
2. try 异常 → catch 执行 → finally 执行 → 返回 catch 的值
3. **注意**：如果 finally 中有 return，会覆盖 try/catch 的 return
4. **注意**：finally 在 return 之前执行，但 return 的值已经计算好了。如果 finally 修改了基本类型变量不影响返回值，但修改对象属性会影响

---

## 4.5 Java IO / NIO

### 小白讲解

```
BIO（Blocking IO）：
  每个连接一个线程，read() 阻塞直到有数据
  适合连接数少且固定的场景

NIO（Non-blocking IO）：
  多路复用器（Selector）+ Channel + Buffer
  一个线程管理多个连接，只有有数据时才处理
  适合连接数多但传输轻量的场景

AIO（Async IO）：
  操作系统完成后回调通知
  适合连接数多且传输重的场景
```

### 面试题

**Q1：BIO、NIO、AIO 的区别？（中频 ⭐⭐⭐）**

| 对比项 | BIO | NIO | AIO |
|--------|-----|-----|-----|
| 通信方式 | 流（Stream）| 通道（Channel）| 通道（Channel）|
| 数据方式 | 面向流 | 面向缓冲（Buffer）| 面向缓冲 |
| 阻塞 | 阻塞 | 非阻塞（多路复用）| 异步 |
| 线程模型 | 一连接一线程 | 一线程多连接 | 回调通知 |
| 适用场景 | 连接少 | 连接多传输少 | 连接多传输多 |

---

# 附：面试高频考点速查表

## 按出现频率排序

| 排名 | 考点 | 一句话答案 |
|------|------|-----------|
| 1 | HashMap 底层原理 | 数组+链表+红黑树，JDK 1.8 尾插法，链表≥8转树 |
| 2 | 线程池参数和流程 | 7 参数，核心→队列→最大→拒绝 |
| 3 | synchronized vs Lock | 关键字 vs 类，自动释放 vs 手动，不可中断 vs 可中断 |
| 4 | volatile 原理 | 可见性+有序性，不保证原子性，内存屏障 |
| 5 | CAS 原理 | 比较并交换，CPU 指令 cmpxchg，ABA 问题 |
| 6 | AQS 原理 | state+CLH 队列，模板方法模式 |
| 7 | JVM 内存结构 | 堆+元空间+栈+本地方法栈+PC |
| 8 | GC 算法 | 标记清除/复制/标记整理，分代回收 |
| 9 | G1 vs CMS | Region 化 vs 物理分代，可预测停顿 vs 不可预测 |
| 10 | 双亲委派 | 先委托父加载器，安全+唯一性 |
| 11 | DCL 单例 | 双重检查+volatile 防指令重排 |
| 12 | ConcurrentHashMap | JDK 1.8 CAS+synchronized 锁桶头节点 |
| 13 | ThreadLocal 内存泄漏 | key 弱引用 value 强引用，必须 remove |
| 14 | 对象进入老年代 | 年龄≥15/大对象/动态年龄/担保失败 |
| 15 | 线程生命周期 | NEW→RUNNABLE→(WAITING/TIMED_WAITING)→TERMINATED |

---

> **使用建议**：先通读讲解部分理解概念，然后对照代码示例自己写一遍，最后用面试题自测。
> 如果某个面试题答不上来，回头再看对应讲解。重点是理解"为什么"而不是背诵"是什么"。
