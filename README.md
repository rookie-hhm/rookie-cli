### rookie-cli 简介
轻量脚手架，目前支持快速创建项目、创建远程仓库、构建及发布项目功能。

### 安装方法
```
npm i @rookie-cli/cli
cnpm i @rookie-cli/cli
```

### 使用方法
```
rookie-cli init
```
通过`--help`查看支持的命令及参数

### 支持命令
`init` 快速创建模板项目。

`publish` 创建远程仓库，提交代码并发布项目到云端。

### .env配置文件
  用户主目录下,具体配置用法参考[dotenv](github.com/motdotla/dotenv#readme)
  |  参数  |   值  |
  | ------| ------ |
  | CLI_HOME | cli配置文件存放的位置 |

### cli配置文件
  默认配置位于用户主目录下的`.rookie-cli`目录下
  ### `.git-info`文件，配置用法跟`.env`相同(操作远程仓库)
  |  参数  |   值  |
  | ------| ------ |
  | GIT_PLATFORM | 代码托管平台(Github/Gitee)
  | GIT_TOKEN | 用于openApi的token |
  | GIT_OWNER | 组织或者个人仓库(user/orgUser)
  | GIT_USERANME | 代码仓库登录用户 |

### 注意事项
  * 远程仓库链接为SSH方式,需要在本地配置好对应仓库的ssh-key
  * 暂不支持history模式
  * 远程分支管理： 
      * master 主分支
      * dev/version: 开发分支
      * release/version: tag发布分支
  * 默认创建与获取的远程仓库名称与`package.json`的`name`相同, 分支版本与`version`相同
  
### 后续跟进
 - [ ] 使用ts重构
 - [ ] 优化构建流程交互
