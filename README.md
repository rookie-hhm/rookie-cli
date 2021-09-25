## rookie-cli 简介
轻量脚手架，支持快速创建项目、构建及发布功能，后续待开发功能

## 使用方法
```
npm i @rookie-cli/cli
or cnpm i @rookie-cli/cli
```

## 支持命令
`init`
`publish` 两个主命令
其余命令，可使用`--help`命令进行查看

## .env配置文件
  用户主目录下,具体配置用法参考[dotenv](github.com/motdotla/dotenv#readme)
  |  参数  |   值  |
  | ------| ------ |
  | CLI_HOME | cli配置文件存放的位置 |
  
## cli配置文件
  默认配置位于用户主目录下的`.rookie-cli`目录下
  ### `.git-info`文件，配置用法跟`.env`相同(操作远程仓库)
  |  参数  |   值  |
  | ------| ------ |
  | GIT_PLATFORM | 代码托管平台(Github/Gitee)
  | GIT_TOKEN | 用于openApi的token |
  | GIT_OWNER | 组织或者个人仓库(user/orgUser)
  | GIT_USERANME | 代码仓库登录用户 |

## 后续跟进
 - [ ] 使用ts重构
