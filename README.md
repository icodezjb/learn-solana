# Solana 开发者资料

1. solana 官网: [https://solana.com/zh](https://solana.com/zh)
2. solana 代码: [https://github.com/solana-labs/](https://github.com/solana-labs/)
3. solana 钱包: [https://phantom.app/](https://phantom.app/)
4. solana 测试币水龙头: [https://solfaucet.com/](https://solfaucet.com/)
5. solana 区块浏览器: [https://explorer.solana.com/](https://explorer.solana.com/)
6. solana NFT市场: [https://magiceden.io/](https://magiceden.io/)
7. solana DEX: [https://www.projectserum.com/](https://www.projectserum.com/)
8. ****A Starter Kit for New Solana Developer****
   [https://hackmd.io/@ironaddicteddog/solana-starter-kit](https://hackmd.io/@ironaddicteddog/solana-starter-kit)

9. **[Solana Cookbook](https://solanacookbook.com/)**
   [https://solanacookbook.com/#contributing](https://solanacookbook.com/#contributing)

10. solana合约开发
    - (0) [The Complete Guide to Full Stack Solana Development with React, Anchor, Rust, and Phantom](https://dev.to/iamsoham07/the-complete-guide-to-full-stack-solana-development-with-react-anchor-rust-and-phantom-5aao)
    - (1) [Solana开发教程：搭建开发环境](https://solongwallet.medium.com/solana%E6%99%BA%E8%83%BD%E5%90%88%E7%BA%A6%E5%BC%80%E5%8F%91-%E6%90%AD%E5%BB%BA%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83-9723b858937e)
    - (2) [Solana开发教程：初识合约开发](https://solongwallet.medium.com/solana%E6%99%BA%E8%83%BD%E5%90%88%E7%BA%A6%E5%BC%80%E5%8F%91-%E5%BC%80%E5%8F%91%E5%B7%A5%E5%85%B7%E9%93%BE-121ed91acca1)
    - (3) [Solana智能合约开发：合约基本概念](https://solongwallet.medium.com/solana%E6%99%BA%E8%83%BD%E5%90%88%E7%BA%A6%E5%BC%80%E5%8F%91-helloworld-%E5%90%88%E7%BA%A6%E5%9F%BA%E6%9C%AC%E6%A6%82%E5%BF%B5-14d68abfb379)
    - (4) [Solana智能合约开发：HelloWorld 合约](https://solongwallet.medium.com/solana%E6%99%BA%E8%83%BD%E5%90%88%E7%BA%A6%E5%BC%80%E5%8F%91-helloworld-%E5%90%88%E7%BA%A6-e780b53a1d0e)
    - (5) [Solana智能合约开发：调试程序](https://solongwallet.medium.com/solana%E6%99%BA%E8%83%BD%E5%90%88%E7%BA%A6%E5%BC%80%E5%8F%91-%E8%B0%83%E8%AF%95%E7%A8%8B%E5%BA%8F-d5d9641a5198)
    - (6) [Solana智能合约开发：SDK的陷阱](https://solongwallet.medium.com/solana%E6%99%BA%E8%83%BD%E5%90%88%E7%BA%A6%E5%BC%80%E5%8F%91-sdk%E7%9A%84%E9%99%B7%E9%98%B1-7513eda581dc)
    - (7) [Solana Web3 Example](https://yihau.github.io/solana-web3-demo/zh/tour/request-airdrop.html)
    
    ```bash
    搭建本地测试网
    solana, solana-test-validator, solana-keygen
    
    rust版本 stable 1.59.0
    
    cd validator/ && ./solana-test-validator 编译solana-test-validator
    cd keygen/ 编译 solana-keygen
    solana 可直接下载 https://github.com/solana-labs/solana/releases/tag/v1.10.29
    
    Xargo.tom 自 solana v1.27开始就不需要了
    https://github.com/solana-labs/solana/pull/22720/files
    
    1. 核心概念
    
    (1) Transactions
    Transaction是由客户端向Solana节点发起请求的单元, 一个Transactions可能包含有多个Instruction.
    Solana 节点在收到一个客户端发起的Transaction后, 会先解析里面的每个Instruction,
    然后根据Instruction里面的 program_id字段, 来调用对应的智能合约, 并将Instruction传递给该智能合约.
    
    (2) Instruction
    Instruction是智能合约处理的基本单元.由[program_id, accounts, data]组成.
    整体流程是DApp客户端将自定义的指令数据序列化到instruction_data里面,然后将program_id,
    相关的AccountMeta列表和instruction_data组装成Instruction,包含到Transactions发送到Solana 
    Leader节点, Solana验证节点构建相应的执行环境,AccountMeta列表被加载为AccountInfo列表
    和instruction_data一起传递给合约程序program,合约程序里面将这个instruction_data数据再反序列化,
    得到客户端传过来的具体参数.
    
    (3) Account
    链上信息存储空间.
    Solana链上的资源包括了内存、文件、CPU(Compute Budge)等,不同于EOS的内存和CPU,
    Solana上只是对合约 运行的的栈大小（4KB),CPU执行时间（200,000 BPF,函数栈深度（64）
    做了最大数量的约定,所以不会出现 EOS上的抢资源的情况.
    Solana链上的信息,不同于EOS上的记录在内存,而是记录在文件中,
    这个文件在Solana上 表现为Account,所以用户所需要支付的就是一个文件存储所需要的花费,
    是以SOL计价的.这里衍生出一个概念, 如果想要关闭文件的话,那么只要把这个Account的SOL都转走,
    那么这个Account对应的地址,在链上就没有钱来买位置了,也就会被删除掉了.
    
    (4) Runtime
    Solana的Runtime是执行BPF字节码的,
    为什么选择了这个runtime而不是WebAssembly或者Lua、Python 之类呢?
    其实主要还是因为性能的考量,Solana引以为傲的就是TPS,而BPF的执行效率更快.
    为了限制一个合约不至于 占光所有资源,runtime对合约的运行做了一些限制,
    当前的限制可以在SDK中查询
    
    (5) PDA
    PDA（program derived addresses, 程序派生地址）是具有特殊属性的地址.
    与普通地址不同,PDA 不是公钥,因此没有关联的私钥.PDA 有两个用例.
    (a) PDA 可以存储程序的状态,提供了一种在链上构建类似hashmap的结构的机制
    通过 PDA, 只要知道用户address就能计算出对应的DappAccount
    (b) PDA 允许program对指令进行签名.
    
    (6) CPI
    CPI(cross-program invocations) 跨程序调用
    PDA 不是公钥,因此它们不可能签署任何东西.但是,PDA 仍然可以对 CPI 进行伪签名.
    对于某些program来说,program本身需要对某些资产拥有权限.
    
    (7) Nonce Account
    Nonce Account用于需要多人签署交易的情况,但他们不能在足够短的时间内在同一台计算机上签署交易.
    在Solana上提交的每笔交易都必须指定一个最近的区块哈希,该区块哈希是在最新区块哈希的 2 分钟内
    生成的.如果获得每个人的签名需要超过 2 分钟,那么您必须使用 Nonce Account.
    
    (8) slot 和 block
    A leader produces at most one block per slot. 
    即每个slot最多只有一个区块.
    pub const DEFAULT_TICKS_PER_SECOND: u64 = 160;
    1秒中对应160个ticks
    pub const DEFAULT_TICKS_PER_SLOT: u64 = 64;
    1个slot对应64个ticks,即0.4秒
    
    (9) Clock
    在合约中通过Clock获得Unix时间戳
    
    (10) msg!
    在合约中通过 msg! 输出链上信息(昂贵的)
    
    (11) Rent
    如果Account.lamport == 0, Account会被删除(accounts_db.clean_accounts)

    每次引用Account的时候，都会进行rent状态检查(RentState)
    当Account.lamport == 0 是 Uninitialized， 交易执行失败
    当Account.lamports >= rent-exempt-minimum 是 RentExempt, 后续不会扣除lamort
    当lamport小于rent-exempt-minimum时，后续会扣除lamport

    若想不被删除Account, 只需向这个Account转SOL, 使得lamport大于等于rent-exemption即可
    
    2. 核心数据结构
    
    (1) Pubkey
    32字节公钥, 而address就其被base58编码的字符串
    
    (2) AccountInfo
    AccountInfo就是一个Account在链上的表达形式,可以认为是一个文件的属性
    
    (3) ProgramResult
    ProgramResult实际上类型为ProgramError的Result对象,而ProgramError是Solana自定义的一个Error的枚举,
    也就是Solana抛出来的错误枚举.在合约中,当正常逻辑执行结束后,我们通过Ok()来返回这里Reuslt正确的结果,
    如果出错了,则通过这里的Result中的ProgramError错误返回.
    
    (4) AccountMeta
    AccountMeta主要用于Instruction结构的定义,用于协助传递这个指令需要的其他AccountInfo,
    其中包括了Account的地址,这个Account是否为签名账号,以及这个Account对应的内容（AccountInfo)是否可以修改.
    
    (5) Instruction
    一条处理指令,包含了要处理他的程序的地址program_id, 涉及的AccountMeta表示的Account,
    还有这条指令附带的payload data
    
    declare_id 用来指定program_id
    https://learn.figment.io/tutorials/build-a-blog-dapp-using-anchor
    system_program 主要事情之一是在Solana上创建Account
    https://buildspace.so/p/build-solana-web3-app/lessons/store-basic-data-on-contract
    
    什么时候需要is_signer == true?
    (1) 这个Account的修改需要你的私钥签名(表明你同意), 比如你转账SOL
    (2) 在一组Instructions中,相同的Account pubkey在CompiledKeys时被去重, 
    也就是说他们中只要有一个is_signer==true就行了
    ```

    
11. BPF virtual machine

    BPF (Berkely packet filter) is most known for its use in the Linux and BSD kernels. The BPF runtime allows safe and predictable execution of arbitrary code at high performance (similar to WebAssembly).

    BPF code is verified for correctness and then JIT-compiled to native x86_64 code before execution. The compiled machine code is cached for further executions.

    ****最神奇的Linux技术 BPF入门****

    [https://zhuanlan.zhihu.com/p/469860384](https://zhuanlan.zhihu.com/p/469860384)

12. ****Solana全方位介绍——共识、钱包、生态、合约****

    [https://learnblockchain.cn/article/3761](https://learnblockchain.cn/article/3761)

13. solana 账户模型

    [https://solana.wiki/zh-cn/docs/account-model/](https://solana.wiki/zh-cn/docs/account-model/)

14. ****Solana 开发学习笔记(一)——从 Hello World 出发****

    [https://learnblockchain.cn/article/3155](https://learnblockchain.cn/article/3155)

15. ****Solana Program Library(合约实例)****

    [https://github.com/solana-labs](https://github.com/solana-labs)

    [https://spl.solana.com/](https://spl.solana.com/)

16. ****Solana 的 Hello world 实例****

    [https://github.com/solana-labs/example-helloworld/blob/master/README_ZH_CN.md](https://github.com/solana-labs/example-helloworld/blob/master/README_ZH_CN.md)

17. ****Understanding Solana’s Mint Accounts and Token Accounts****

    [https://medium.com/@jorge.londono_31005/understanding-solanas-mint-account-and-token-accounts-546c0590e8e](https://medium.com/@jorge.londono_31005/understanding-solanas-mint-account-and-token-accounts-546c0590e8e)

18. Solana 合约开发框架

    [https://www.anchor-lang.com/](https://www.anchor-lang.com/)
    ****Anchor framework example****

    [https://learn.figment.io/tutorials/build-a-blog-dapp-using-anchor](https://learn.figment.io/tutorials/build-a-blog-dapp-using-anchor)

19. ****Solana Programming Primer****

    [https://betterprogramming.pub/solana-programming-primer-1c8aae509346](https://betterprogramming.pub/solana-programming-primer-1c8aae509346)

20. ****Solana 扩容分析：高效率,性能成本,极限尝试****

    [https://mirror.xyz/0x64A156A617C4226665c79F6cC8cCF078A4650E26/KnXXg9N_6Wj8Ct_xv6iXaqFo0OVwQsqTiMwwGRpgxbk](https://mirror.xyz/0x64A156A617C4226665c79F6cC8cCF078A4650E26/KnXXg9N_6Wj8Ct_xv6iXaqFo0OVwQsqTiMwwGRpgxbk)

21. **Starting with Solana, Part 4 - A Todo List with Rewards**

    [https://imfeld.dev/writing/starting_with_solana_part04](https://imfeld.dev/writing/starting_with_solana_part04)

22. ****Using PDAs and SPL Token in Anchor****

    [https://betterprogramming.pub/using-pdas-and-spl-token-in-anchor-and-solana-df05c57ccd04](https://betterprogramming.pub/using-pdas-and-spl-token-in-anchor-and-solana-df05c57ccd04)

23. ****Write your first Solana program****

    [https://buildspace.so/p/build-solana-web3-app/lessons/write-first-solana-program](https://buildspace.so/p/build-solana-web3-app/lessons/write-first-solana-program)

24. ****写给Solidity开发者的Solana入门指南****

    [https://learnblockchain.cn/article/4375](https://learnblockchain.cn/article/4375)

25. BtreeMap in program

    [https://solanacookbook.com/guides/account-maps.html#single-map-account](https://solanacookbook.com/guides/account-maps.html#single-map-account)


```txt
常见错误
1. SendTransactionError: failed to send transaction: Transaction simulation failed: This transaction has already been processed
原因: 上一笔交易没有finalized就发交易
解决: 等上一笔交易finalized

2. SendTransactionError: failed to send transaction: Transaction simulation failed: Error processing Instruction 0: incorrect program id for instruction
原因: Account owner不是program
解决: 检查这个Account是否在链上创建或者是否选错了Account

3. Error: AnchorError occurred. Error Code: DeclaredProgramIdMismatch. Error Number: 4100. Error Message: The declared program id does not match the actual program id.
原因: 链上实际的program_id与lib.rs和Anchor.toml中的不一致
解决: 运行anchor keys list,将这个地址复制到Anchor.toml和lib.rs中,部署的时候检查program_id是否一致

```
