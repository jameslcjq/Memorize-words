import { DonatingCard } from '../DonatingCard'
import { StickerButton } from '../DonatingCard/components/StickerButton'
import redBookCode from '@/assets/redBook-code.jpg'
import InfoPanel from '@/components/InfoPanel'
import Tooltip from '@/components/Tooltip'
import { infoPanelStateAtom } from '@/store'
import type { InfoPanelType } from '@/typings'
import { recordOpenInfoPanelAction } from '@/utils'
import { useAtom } from 'jotai'
import type React from 'react'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import IconMail from '~icons/material-symbols/mail'
import IconCoffee2 from '~icons/mdi/coffee'
import IconXiaoHongShu from '~icons/my-icons/xiaohongshu'
import RiLinksLine from '~icons/ri/links-line'
import IconTwitter from '~icons/ri/twitter-fill'
import IconGithub from '~icons/simple-icons/github'
import IconWechat2 from '~icons/simple-icons/wechat'
import IconWechat from '~icons/tabler/brand-wechat'
import IconCoffee from '~icons/tabler/coffee'
import IconTerminal2 from '~icons/tabler/terminal-2'
import IconFlagChina from '~icons/twemoji/flag-china'

const Footer: React.FC = () => {
  const [infoPanelState, setInfoPanelState] = useAtom(infoPanelStateAtom)
  const navigate = useNavigate()

  const handleOpenInfoPanel = useCallback(
    (modalType: InfoPanelType) => {
      recordOpenInfoPanelAction(modalType, 'footer')
      setInfoPanelState((state) => ({ ...state, [modalType]: true }))
    },
    [setInfoPanelState],
  )

  const handleCloseInfoPanel = useCallback(
    (modalType: InfoPanelType) => {
      setInfoPanelState((state) => ({ ...state, [modalType]: false }))
    },
    [setInfoPanelState],
  )

  return (
    <>
      <InfoPanel
        openState={infoPanelState.donate}
        title="Buy us a coffee"
        icon={IconCoffee}
        buttonClassName="bg-amber-500 hover:bg-amber-400"
        iconClassName="text-amber-500 bg-amber-100 dark:text-amber-300 dark:bg-amber-500"
        onClose={() => handleCloseInfoPanel('donate')}
      >
        <p className="indent-4 text-sm text-gray-500 dark:text-gray-300">
          非常感谢大家使用 老九背单词，目前该网站使用业余时间在维护，为了保证网站能够持续地提供给大家高质量的服务，我们需要您的帮助！
          <br />
          您的捐款将有助于我们支付网站的运营成本，改进网站的功能和设计，并提高用户体验。
          <br />
        </p>
        <br />
        <p className="indent-4 text-sm text-gray-700 dark:text-gray-200">
          我们相信，共同的努力可以让 老九背单词 成为更好的学习平台，也相信您的支持将给予我们持续前进的动力。 感谢您的支持！
        </p>
        <br />
        <p className="indent-4 text-sm text-gray-700 dark:text-gray-200">
          为了感谢您的慷慨，单次 50 rmb 及以上的捐赠， 我们将回赠 Qwerty 的定制贴纸 5 枚<span className="text-xs">（仅限大陆地区）</span>
          ，希望您可以跟朋友分享您的快乐
        </p>
        <div className="flex items-center justify-center py-2">
          <StickerButton className="" />
        </div>

        <DonatingCard />
      </InfoPanel>

      <InfoPanel
        openState={infoPanelState.community}
        title="用户反馈社群"
        icon={IconWechat}
        buttonClassName="bg-green-500 hover:bg-green-400"
        iconClassName="text-green-500 bg-green-100 dark:text-green-300 dark:bg-green-500"
        onClose={() => handleCloseInfoPanel('community')}
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">
          老九背单词 是一个开源项目，旨在为用户提供高质量、可靠的打字练习工具。
          <br />
          加入我们的用户社群后，您可以与我们的开发团队进行沟通，分享您的使用体验 and
          建议，帮助我们改进产品，同时也能够及时了解我们的最新动态和更新内容。
          <br />
          <br />
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200">
          我们深信，与用户的良好互动和反馈是推动我们不断前进和提高的重要因素。因此，我们诚挚邀请您加入我们的社群，与我们一起打造更好的
          「老九背单词」！
        </p>
        <br />
        <p className="text-sm text-gray-500  dark:text-gray-400">再次感谢您的支持和关注！</p>
        <br />
        <img className="ml-1 w-2/6 " src="https://qwerty.kaiyi.cool/weChat-group.png" alt="weChat-group" />
        <br />
      </InfoPanel>

      <InfoPanel
        openState={infoPanelState.redBook}
        title="小红书社群"
        icon={IconXiaoHongShu}
        buttonClassName="bg-red-500 hover:bg-red-400"
        iconClassName="text-red-500 bg-red-100 dark:text-red-600 dark:bg-red-500"
        onClose={() => handleCloseInfoPanel('redBook')}
      >
        <p className="text-sm text-gray-500  dark:text-gray-400">
          老九背单词 是一个开源项目，旨在为用户提供高质量、可靠的打字练习工具。
          <br />
          关注小红书后，您可以获得开发团队的最新动态和更新内容，反馈您的使用体验和建议，帮助我们改进产品。
          <br />
          <br />
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200">
          我们深信，与用户的良好互动和反馈是推动我们不断前进和提高的重要因素。因此，我们诚挚邀请您关注我们的小红书账号，与我们一起打造更好的
          「老九背单词」！
        </p>
        <br />
        <img className="ml-1 w-5/12 " src={redBookCode} alt="redBook" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Tips: 从小红书“我”的左上角点击 三 找到 扫一扫</p>
        <br />
      </InfoPanel>

      <footer className="mb-1 mt-4 flex w-full items-center justify-center gap-2.5 text-sm ease-in" onClick={(e) => e.currentTarget.blur()}>
        <span className="text-gray-500 dark:text-gray-400">@ 老九背单词</span>
      </footer>
    </>
  )
}

export default Footer
