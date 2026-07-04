from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = Path("outputs/xhs-promo")
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1080, 1440
COL = {
    "bg": (248, 241, 229),
    "panel": (255, 250, 240),
    "ink": (16, 16, 16),
    "muted": (97, 88, 78),
    "yellow": (244, 216, 95),
    "pink": (242, 169, 214),
    "green": (29, 128, 108),
    "green_soft": (223, 242, 232),
    "blue": (201, 220, 245),
    "orange": (255, 126, 40),
    "line": (222, 212, 199),
    "white": (255, 253, 248),
}

FONT_R = "C:/Windows/Fonts/msyh.ttc"
FONT_B = "C:/Windows/Fonts/msyhbd.ttc"


def font(size, bold=False):
    return ImageFont.truetype(FONT_B if bold else FONT_R, size)


def rounded(draw, xy, r, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)


def wrap_text(draw, text, fnt, max_w):
    lines, cur = [], ""
    for ch in text:
        test = cur + ch
        if draw.textbbox((0, 0), test, font=fnt)[2] <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = ch
    if cur:
        lines.append(cur)
    return lines


def text_block(draw, xy, text, fnt, fill, max_w, gap=8):
    x, y = xy
    for line in wrap_text(draw, text, fnt, max_w):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += fnt.size + gap
    return y


def shadow_card(base, xy, r=26, fill=COL["panel"], outline=COL["line"]):
    x1, y1, x2, y2 = xy
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x1 + 10, y1 + 14, x2 + 10, y2 + 14), r, fill=(0, 0, 0, 30))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    base.alpha_composite(shadow)
    d = ImageDraw.Draw(base)
    d.rounded_rectangle(xy, r, fill=fill, outline=outline, width=2)
    return d


def logo(draw, x, y, s=84):
    rounded(draw, (x, y, x + s, y + s), 24, (255, 157, 43))
    draw.ellipse((x + s * 0.68, y + s * 0.16, x + s * 0.83, y + s * 0.31), fill=(255, 248, 168))
    draw.text((x + 16, y + 25), "win", font=font(28, True), fill="white")


def header(draw, title, subtitle=None):
    logo(draw, 60, 54, 78)
    draw.text((160, 60), "应届生 Win Job", font=font(35, True), fill=COL["ink"])
    draw.text((160, 108), "求职信息管理工具", font=font(22), fill=COL["muted"])
    y = 185
    for line in title.split("\n"):
        draw.text((60, y), line, font=font(58, True), fill=COL["ink"])
        y += 74
    if subtitle:
        text_block(draw, (60, y + 6), subtitle, font(25), COL["muted"], 900, 10)


def pill(draw, xy, text, fill, color=COL["ink"]):
    x, y = xy
    tw = draw.textbbox((0, 0), text, font=font(22, True))[2]
    rounded(draw, (x, y, x + tw + 34, y + 42), 20, fill)
    draw.text((x + 17, y + 8), text, font=font(22, True), fill=color)
    return x + tw + 46


def mini_browser(base, xy, title="graduate-jobs.pages.dev"):
    d = shadow_card(base, xy, 24, COL["white"])
    x1, y1, x2, _ = xy
    rounded(d, (x1, y1, x2, y1 + 62), 24, (245, 236, 223), outline=None)
    d.ellipse((x1 + 24, y1 + 22, x1 + 38, y1 + 36), fill=(255, 91, 86))
    d.ellipse((x1 + 48, y1 + 22, x1 + 62, y1 + 36), fill=(255, 190, 70))
    d.ellipse((x1 + 72, y1 + 22, x1 + 86, y1 + 36), fill=(58, 190, 105))
    rounded(d, (x1 + 120, y1 + 16, x2 - 26, y1 + 46), 15, (255, 253, 248), outline=(230, 220, 208))
    d.text((x1 + 138, y1 + 20), title, font=font(17), fill=COL["muted"])
    return d


def draw_sidebar(d, x, y, w, h, active=0):
    rounded(d, (x, y, x + w, y + h), 18, COL["ink"])
    logo(d, x + 30, y + 32, 70)
    d.text((x + 30, y + 122), "应届生\nWin Job", font=font(31, True), fill="white", spacing=0)
    items = ["首页", "个人信息", "岗位信息", "我的岗位", "面试情报", "待发布"]
    yy = y + 250
    for i, item in enumerate(items):
        if i == active:
            rounded(d, (x + 25, yy - 8, x + w - 25, yy + 40), 10, COL["yellow"])
        d.text((x + 42, yy), item, font=font(20, True), fill=COL["ink"] if i == active else (240, 235, 226))
        yy += 58


def draw_dashboard(d, x, y):
    cards = [("0", "每日新增岗位", COL["yellow"]), ("1357", "浏览岗位", COL["pink"]), ("12", "收藏岗位", (159, 195, 106)), ("5", "已投递岗位", COL["blue"])]
    cx = x
    for num, label, c in cards:
        rounded(d, (cx, y, cx + 150, y + 112), 14, c)
        d.text((cx + 22, y + 18), num, font=font(36, True), fill=COL["ink"])
        d.text((cx + 22, y + 70), label, font=font(17, True), fill=COL["ink"])
        cx += 168
    rounded(d, (x, y + 140, x + 648, y + 330), 14, COL["panel"], outline=COL["line"])
    d.text((x + 26, y + 165), "推荐岗位", font=font(27, True), fill=COL["ink"])
    d.text((x + 82, y + 238), "填写意向岗位后，这里会出现推荐岗位", font=font(22), fill=COL["muted"])


def draw_table(d, x, y, w=680):
    rounded(d, (x, y, x + w, y + 410), 14, COL["white"], outline=COL["line"])
    d.rectangle((x, y, x + w, y + 54), fill=(245, 236, 223))
    heads = ["企业", "岗位", "地点", "要求", "操作"]
    col = [x + 22, x + 150, x + 342, x + 455, x + 590]
    for h, c in zip(heads, col):
        d.text((c, y + 16), h, font=font(18, True), fill=COL["muted"])
    rows = [("内蒙古农商银行", "总行管培生", "多地", "本科及以上"), ("比亚迪", "研发工程师", "深圳/西安", "本科及以上"), ("美团", "产品运营", "北京/上海", "本科")]
    yy = y + 78
    for comp, role, city, deg in rows:
        d.text((x + 22, yy), comp, font=font(18, True), fill=COL["ink"])
        d.text((x + 150, yy), role, font=font(18, True), fill=COL["green"])
        d.text((x + 342, yy), city, font=font(17), fill=COL["ink"])
        d.text((x + 455, yy), deg, font=font(17), fill=COL["ink"])
        rounded(d, (x + 590, yy - 4, x + 655, yy + 30), 8, COL["green"])
        d.text((x + 602, yy + 1), "投递", font=font(15, True), fill="white")
        yy += 96


def draw_dropzone(d, x, y, w, h, text):
    rounded(d, (x, y, x + w, y + h), 16, COL["white"], outline=COL["line"], width=2)
    d.text((x + 30, y + 28), "粘贴 / 拖拽 / 上传截图", font=font(24, True), fill=COL["ink"])
    d.text((x + 30, y + 72), text, font=font(19), fill=COL["muted"])
    rounded(d, (x + w - 150, y + 32, x + w - 55, y + 118), 14, COL["green_soft"], outline=COL["green"])
    d.polygon([(x + w - 135, y + 100), (x + w - 112, y + 76), (x + w - 92, y + 98)], fill=COL["green"])
    d.ellipse((x + w - 92, y + 52, x + w - 75, y + 69), fill=COL["yellow"])


def base():
    img = Image.new("RGBA", (W, H), COL["bg"] + (255,))
    d = ImageDraw.Draw(img)
    d.ellipse((760, -120, 1240, 360), fill=(223, 242, 232, 160))
    d.ellipse((-120, 1050, 340, 1520), fill=(242, 169, 214, 120))
    d.ellipse((720, 1080, 1160, 1500), fill=(244, 216, 95, 150))
    return img, d


def save(img, name):
    img.convert("RGB").save(OUT / name, quality=95)


def main():
    img, d = base()
    header(d, "收藏夹里200条岗位截图\n终于整理到一个网页里", "岗位、投递、面经、待办，都放进一个求职工作台。")
    mini_browser(img, (76, 500, 1004, 1120))
    d = ImageDraw.Draw(img)
    draw_sidebar(d, 106, 560, 185, 500)
    draw_dashboard(d, 320, 600)
    draw_table(d, 320, 830, 620)
    pill(d, (80, 1190), "早鸟版 8.66", COL["yellow"])
    pill(d, (300, 1190), "无隐藏二次收费", COL["pink"])
    pill(d, (590, 1190), "投递以官网为准", COL["green_soft"], COL["green"])
    d.text((80, 1280), "适合正在准备实习、秋招、校招的同学", font=font(26, True), fill=COL["ink"])
    save(img, "01-cover.png")

    img, d = base()
    header(d, "首页：一眼看清\n今天要求职什么", "新增岗位、收藏、已投递、待办日历，求职进度不用靠脑子记。")
    mini_browser(img, (70, 470, 1010, 1170))
    d = ImageDraw.Draw(img)
    draw_sidebar(d, 105, 535, 170, 560)
    draw_dashboard(d, 310, 545)
    rounded(d, (650, 705, 940, 1090), 14, COL["panel"], outline=COL["line"])
    d.text((680, 730), "待办日历", font=font(25, True), fill=COL["ink"])
    for i in range(5):
        for j in range(4):
            x, y = 680 + i * 48, 790 + j * 58
            rounded(d, (x, y, x + 38, y + 46), 8, COL["white"], outline=COL["line"])
            d.text((x + 10, y + 12), str(i + j * 5 + 1), font=font(14, True), fill=COL["ink"])
    rounded(d, (724, 790, 762, 836), 8, COL["yellow"], outline=COL["ink"])
    d.ellipse((738, 823, 747, 832), fill=COL["pink"])
    pill(d, (80, 1220), "记录投递节奏", COL["yellow"])
    pill(d, (330, 1220), "减少漏投", COL["green_soft"], COL["green"])
    pill(d, (520, 1220), "每天知道下一步", COL["pink"])
    save(img, "02-home-dashboard.png")

    img, d = base()
    header(d, "岗位信息：筛选后再投\n别在一堆链接里迷路", "按城市、学历、岗位类型筛选，最后跳转企业官方页面投递。")
    mini_browser(img, (70, 450, 1010, 1160))
    d = ImageDraw.Draw(img)
    draw_sidebar(d, 105, 515, 170, 570, active=2)
    for i, (lab, val) in enumerate([("关键词", "产品经理"), ("地点", "上海"), ("学历", "本科及以上"), ("类型", "提前批")]):
        x = 310 + i * 155
        rounded(d, (x, 525, x + 135, 585), 10, COL["white"], outline=COL["line"])
        d.text((x + 14, 535), lab, font=font(14, True), fill=COL["muted"])
        d.text((x + 14, 558), val, font=font(16), fill=COL["ink"])
    draw_table(d, 310, 625, 650)
    pill(d, (80, 1210), "官方投递入口", COL["green_soft"], COL["green"])
    pill(d, (330, 1210), "学历/城市匹配", COL["yellow"])
    pill(d, (590, 1210), "收藏后再比较", COL["pink"])
    save(img, "03-job-list.png")

    img, d = base()
    header(d, "小红书岗位截图\n直接粘贴进网页", "复制截图后 Ctrl+V，自动识别文字，再保存成自己的岗位清单。")
    mini_browser(img, (70, 450, 1010, 1160))
    d = ImageDraw.Draw(img)
    draw_sidebar(d, 105, 515, 170, 570, active=3)
    d.text((320, 525), "我的岗位 · 新增岗位", font=font(32, True), fill=COL["ink"])
    draw_dropzone(d, 320, 590, 620, 170, "支持小红书、公众号、群聊、招聘海报截图")
    for idx, (a, b) in enumerate([("企业名称", "比亚迪"), ("岗位名称", "研发工程师"), ("工作地点", "深圳 / 西安"), ("学历要求", "本科及以上")]):
        x, y = 320 + (idx % 2) * 310, 800 + (idx // 2) * 90
        rounded(d, (x, y, x + 285, y + 64), 10, COL["white"], outline=COL["line"])
        d.text((x + 14, y + 8), a, font=font(14, True), fill=COL["muted"])
        d.text((x + 14, y + 32), b, font=font(18), fill=COL["ink"])
    rounded(d, (675, 1008, 820, 1060), 12, COL["pink"])
    d.text((700, 1020), "识别信息", font=font(22, True), fill=COL["ink"])
    rounded(d, (835, 1008, 940, 1060), 12, COL["ink"])
    d.text((856, 1020), "保存", font=font(22, True), fill="white")
    pill(d, (80, 1210), "不用手动抄字段", COL["yellow"])
    pill(d, (400, 1210), "不混入公共岗位库", COL["green_soft"], COL["green"])
    save(img, "04-my-jobs-ocr.png")

    img, d = base()
    header(d, "面经评论太碎？\n先整理成复盘重点", "把面经截图/评论区截图识别后，整理成笔试题、面试题、流程和风险提醒。")
    mini_browser(img, (70, 450, 1010, 1160))
    d = ImageDraw.Draw(img)
    draw_sidebar(d, 105, 515, 170, 570, active=4)
    d.text((320, 525), "面试情报检索助手", font=font(31, True), fill=COL["ink"])
    draw_dropzone(d, 320, 590, 620, 145, "上传面经截图、评论区截图，辅助整理复习重点")
    for i, (a, b) in enumerate([("笔试 / 测评", "SQL、行测、逻辑题"), ("高频面试题", "项目深挖、自我介绍"), ("面试流程", "一面 → 二面 → HR"), ("风险提醒", "反馈慢、岗位要求需核对")]):
        x, y = 320 + (i % 2) * 310, 775 + (i // 2) * 125
        rounded(d, (x, y, x + 285, y + 98), 12, COL["white"], outline=COL["line"])
        d.text((x + 18, y + 16), a, font=font(20, True), fill=COL["ink"])
        d.text((x + 18, y + 55), b, font=font(17), fill=COL["muted"])
    pill(d, (80, 1210), "辅助整理，不替代判断", COL["green_soft"], COL["green"])
    pill(d, (430, 1210), "面试前复盘更清楚", COL["pink"])
    save(img, "05-interview-summary.png")

    img, d = base()
    header(d, "有些企业还没发？\n先关注待发布提醒", "参考往年发布节奏，提前关注企业官网，不代表今年一定发布。")
    mini_browser(img, (70, 450, 1010, 1160))
    d = ImageDraw.Draw(img)
    draw_sidebar(d, 105, 515, 170, 570, active=5)
    d.text((320, 525), "待发布岗位 / 往年参考", font=font(30, True), fill=COL["ink"])
    y = 590
    for comp, win, st in [("腾讯", "7月下旬-8月中旬", "重点关注"), ("字节跳动", "7月-9月", "重点关注"), ("美团", "8月上旬-9月", "建议关注"), ("国家电网", "9月-次年春季", "长期关注")]:
        rounded(d, (320, y, 940, y + 100), 14, COL["white"], outline=COL["line"])
        d.text((342, y + 18), comp, font=font(23, True), fill=COL["ink"])
        d.text((342, y + 55), f"关注窗口：{win}", font=font(18), fill=COL["muted"])
        rounded(d, (790, y + 24, 920, y + 62), 18, COL["yellow"] if st != "长期关注" else COL["green_soft"])
        d.text((810, y + 31), st, font=font(16, True), fill=COL["green"] if st == "长期关注" else COL["ink"])
        y += 118
    np = pill(d, (80, 1210), "公开信息整理", COL["yellow"])
    pill(d, (np + 15, 1210), "投递以官网为准", COL["green_soft"], COL["green"])
    save(img, "06-watchlist.png")
    print(f"created {len(list(OUT.glob('*.png')))} images in {OUT}")


if __name__ == "__main__":
    main()
