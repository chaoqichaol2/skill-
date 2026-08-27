/*****************************************************************************
 * Codex Traffic Light for Waveshare RP2350-Touch-LCD-3.49
 * Display, touch and DMA glue adapted from the Waveshare LVGL example.
 *****************************************************************************/
#include "LVGL_example.h"

#include <ctype.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#include "pico/bootrom.h"
#include "pico/multicore.h"
#include "psram_tool.h"
#include "rp_pico_alloc.h"
#include "src/core/lv_obj.h"
#include "src/misc/lv_area.h"

typedef enum {
    CODEX_IDLE = 0,
    CODEX_WORKING,
    CODEX_WAITING,
    CODEX_DONE
} codex_state_t;

static lv_disp_drv_t disp_drv;
static lv_disp_draw_buf_t disp_buf;
static lv_color_t *buf0;
static lv_color_t *buf_rotated;

static lv_obj_t *lamp_red;
static lv_obj_t *lamp_yellow;
static lv_obj_t *lamp_green;
static lv_obj_t *status_label;
static lv_obj_t *detail_label;
static lv_obj_t *app_view;
static lv_obj_t *traffic_page;
static lv_obj_t *lyrics_page;
static lv_obj_t *song_label;
static lv_obj_t *artist_label;
static lv_obj_t *lyric_previous_label;
static lv_obj_t *lyric_current_label;
static lv_obj_t *lyric_next_label;
static codex_state_t current_state = CODEX_IDLE;
static int task_count;

static uint16_t ts_x;
static uint16_t ts_y;
static lv_indev_state_t ts_act;
static lv_indev_drv_t indev_ts;

static struct repeating_timer lvgl_timer;
static char serial_line[512];
static size_t serial_len;
static bool demo_running;
static uint8_t demo_step;
static uint32_t demo_next_ms;

static void disp_flush_cb(lv_disp_drv_t *disp, const lv_area_t *area, lv_color_t *color_p);
static void touch_callback(uint gpio, uint32_t events);
static void ts_read_cb(lv_indev_drv_t *drv, lv_indev_data_t *data);
static void dma_handler(void);
static bool repeating_lvgl_timer_callback(struct repeating_timer *t);
static void lamp_event_cb(lv_event_t *event);
static void idle_event_cb(lv_event_t *event);
static void update_ui(void);
static void handle_serial_line(char *line);
static bool json_get_string(const char *json, const char *key, char *output, size_t output_size);

void LVGL_Init(void)
{
    add_repeating_timer_ms(5, repeating_lvgl_timer_callback, NULL, &lvgl_timer);

    lv_init();

    buf0 = (lv_color_t *)malloc(sizeof(lv_color_t) * UI_HOR_RES * UI_VER_RES);
    buf_rotated = (lv_color_t *)malloc(sizeof(lv_color_t) * UI_HOR_RES * UI_VER_RES);
    lv_disp_draw_buf_init(&disp_buf, buf0, NULL, UI_HOR_RES * UI_VER_RES);
    lv_disp_drv_init(&disp_drv);
    disp_drv.flush_cb = disp_flush_cb;
    disp_drv.draw_buf = &disp_buf;
    disp_drv.hor_res = UI_HOR_RES;
    disp_drv.ver_res = UI_VER_RES;
    disp_drv.full_refresh = 1;
    disp_drv.direct_mode = 0;
    lv_disp_drv_register(&disp_drv);

#if INPUTDEV_TS
    lv_indev_drv_init(&indev_ts);
    indev_ts.type = LV_INDEV_TYPE_POINTER;
    indev_ts.read_cb = ts_read_cb;
    lv_indev_drv_register(&indev_ts);
    DEV_KEY_Config(TOUCH_INT_PIN);
    DEV_IRQ_SET(TOUCH_INT_PIN, GPIO_IRQ_EDGE_FALL, &touch_callback);
#endif

    dma_channel_set_irq0_enabled(dma_tx, true);
    irq_set_exclusive_handler(DMA_IRQ_0, dma_handler);
    irq_set_enabled(DMA_IRQ_0, true);
}

static lv_obj_t *create_lamp(lv_obj_t *parent, int x, codex_state_t state)
{
    lv_obj_t *lamp = lv_obj_create(parent);
    lv_obj_set_size(lamp, 92, 92);
    lv_obj_set_pos(lamp, x, 40);
    lv_obj_set_style_radius(lamp, LV_RADIUS_CIRCLE, 0);
    lv_obj_set_style_bg_color(lamp, lv_color_hex(0x151A20), 0);
    lv_obj_set_style_bg_opa(lamp, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(lamp, 7, 0);
    lv_obj_set_style_border_color(lamp, lv_color_hex(0x2A313B), 0);
    lv_obj_set_style_shadow_width(lamp, 0, 0);
    lv_obj_clear_flag(lamp, LV_OBJ_FLAG_SCROLLABLE);
    lv_obj_add_event_cb(lamp, lamp_event_cb, LV_EVENT_CLICKED, (void *)(uintptr_t)state);
    return lamp;
}

void Widgets_Init(void)
{
    lv_obj_t *root = lv_scr_act();
    lv_obj_set_style_bg_color(root, lv_color_hex(0x080A0D), 0);
    lv_obj_set_style_bg_opa(root, LV_OPA_COVER, 0);
    lv_obj_clear_flag(root, LV_OBJ_FLAG_SCROLLABLE);

    app_view = lv_tileview_create(root);
    lv_obj_set_size(app_view, UI_HOR_RES, UI_VER_RES);
    lv_obj_set_style_bg_color(app_view, lv_color_hex(0x080A0D), 0);
    lv_obj_set_style_bg_opa(app_view, LV_OPA_COVER, 0);
    lv_obj_set_scrollbar_mode(app_view, LV_SCROLLBAR_MODE_OFF);
    lv_obj_set_style_pad_all(app_view, 0, 0);
    traffic_page = lv_tileview_add_tile(app_view, 0, 0, LV_DIR_RIGHT);
    lyrics_page = lv_tileview_add_tile(app_view, 1, 0, LV_DIR_LEFT);
    lv_obj_set_style_bg_color(traffic_page, lv_color_hex(0x080A0D), 0);
    lv_obj_set_style_bg_color(lyrics_page, lv_color_hex(0x080A0D), 0);
    lv_obj_t *screen = traffic_page;

    lv_obj_t *title = lv_label_create(screen);
    lv_label_set_text(title, "CODEX");
    lv_obj_set_style_text_font(title, &lv_font_montserrat_28, 0);
    lv_obj_set_style_text_color(title, lv_color_hex(0xF4F7FA), 0);
    lv_obj_set_pos(title, 22, 17);

    lv_obj_t *usb_label = lv_label_create(screen);
    lv_label_set_text(usb_label, "USB STATUS LIGHT");
    lv_obj_set_style_text_font(usb_label, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(usb_label, lv_color_hex(0x687282), 0);
    lv_obj_set_pos(usb_label, 23, 52);

    lamp_red = create_lamp(screen, 205, CODEX_WAITING);
    lamp_yellow = create_lamp(screen, 315, CODEX_WORKING);
    lamp_green = create_lamp(screen, 425, CODEX_DONE);

    status_label = lv_label_create(screen);
    lv_obj_set_width(status_label, 160);
    lv_obj_set_style_text_align(status_label, LV_TEXT_ALIGN_LEFT, 0);
    lv_obj_set_style_text_font(status_label, &lv_font_montserrat_24, 0);
    lv_obj_set_style_text_color(status_label, lv_color_hex(0xF4F7FA), 0);
    lv_obj_set_pos(status_label, 22, 82);

    detail_label = lv_label_create(screen);
    lv_obj_set_width(detail_label, 170);
    lv_obj_set_style_text_align(detail_label, LV_TEXT_ALIGN_LEFT, 0);
    lv_obj_set_style_text_font(detail_label, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(detail_label, lv_color_hex(0x8993A1), 0);
    lv_obj_set_pos(detail_label, 23, 115);

    lv_obj_t *idle_button = lv_btn_create(screen);
    lv_obj_set_size(idle_button, 88, 42);
    lv_obj_set_pos(idle_button, 535, 65);
    lv_obj_set_style_radius(idle_button, 21, 0);
    lv_obj_set_style_bg_color(idle_button, lv_color_hex(0x202630), 0);
    lv_obj_set_style_shadow_width(idle_button, 0, 0);
    lv_obj_add_event_cb(idle_button, idle_event_cb, LV_EVENT_CLICKED, NULL);

    lv_obj_t *idle_label = lv_label_create(idle_button);
    lv_label_set_text(idle_label, "IDLE");
    lv_obj_set_style_text_font(idle_label, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(idle_label, lv_color_hex(0xC6CDD6), 0);
    lv_obj_center(idle_label);

    lv_obj_t *music_icon = lv_label_create(lyrics_page);
    lv_label_set_text(music_icon, LV_SYMBOL_AUDIO);
    lv_obj_set_style_text_font(music_icon, &lv_font_montserrat_30, 0);
    lv_obj_set_style_text_color(music_icon, lv_color_hex(0xE92C3A), 0);
    lv_obj_set_pos(music_icon, 23, 14);

    lv_obj_t *music_title = lv_label_create(lyrics_page);
    lv_label_set_text(music_title, "NETEASE MUSIC");
    lv_obj_set_style_text_font(music_title, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(music_title, lv_color_hex(0xE92C3A), 0);
    lv_obj_set_pos(music_title, 62, 22);

    song_label = lv_label_create(lyrics_page);
    lv_obj_set_width(song_label, 168);
    lv_label_set_long_mode(song_label, LV_LABEL_LONG_SCROLL_CIRCULAR);
    lv_obj_set_style_anim_speed(song_label, 35, 0);
    lv_obj_set_style_text_align(song_label, LV_TEXT_ALIGN_LEFT, 0);
    lv_obj_set_style_text_font(song_label, &lv_font_simsun_16_cjk, 0);
    lv_obj_set_style_text_color(song_label, lv_color_hex(0xF4F7FA), 0);
    lv_obj_set_pos(song_label, 23, 60);
    lv_label_set_text(song_label, "等待网易云音乐");

    artist_label = lv_label_create(lyrics_page);
    lv_obj_set_width(artist_label, 168);
    lv_label_set_long_mode(artist_label, LV_LABEL_LONG_SCROLL_CIRCULAR);
    lv_obj_set_style_anim_speed(artist_label, 35, 0);
    lv_obj_set_style_text_align(artist_label, LV_TEXT_ALIGN_LEFT, 0);
    lv_obj_set_style_text_font(artist_label, &lv_font_simsun_16_cjk, 0);
    lv_obj_set_style_text_color(artist_label, lv_color_hex(0x7D8795), 0);
    lv_obj_set_pos(artist_label, 23, 88);
    lv_label_set_text(artist_label, "USB 歌词桥接已就绪");

    lv_obj_t *divider = lv_obj_create(lyrics_page);
    lv_obj_set_size(divider, 2, 132);
    lv_obj_set_pos(divider, 205, 20);
    lv_obj_set_style_bg_color(divider, lv_color_hex(0x272D36), 0);
    lv_obj_set_style_border_width(divider, 0, 0);

    lyric_previous_label = lv_label_create(lyrics_page);
    lv_obj_set_width(lyric_previous_label, 405);
    lv_label_set_long_mode(lyric_previous_label, LV_LABEL_LONG_SCROLL_CIRCULAR);
    lv_obj_set_style_anim_speed(lyric_previous_label, 40, 0);
    lv_obj_set_style_text_align(lyric_previous_label, LV_TEXT_ALIGN_LEFT, 0);
    lv_obj_set_style_text_font(lyric_previous_label, &lv_font_simsun_16_cjk, 0);
    lv_obj_set_style_text_color(lyric_previous_label, lv_color_hex(0x555E6B), 0);
    lv_obj_set_pos(lyric_previous_label, 226, 26);
    lv_label_set_text(lyric_previous_label, "");

    lyric_current_label = lv_label_create(lyrics_page);
    lv_obj_set_width(lyric_current_label, 405);
    lv_label_set_long_mode(lyric_current_label, LV_LABEL_LONG_SCROLL_CIRCULAR);
    lv_obj_set_style_anim_speed(lyric_current_label, 45, 0);
    lv_obj_set_style_text_align(lyric_current_label, LV_TEXT_ALIGN_LEFT, 0);
    lv_obj_set_style_text_font(lyric_current_label, &lv_font_simsun_16_cjk, 0);
    lv_obj_set_style_text_color(lyric_current_label, lv_color_hex(0xFFFFFF), 0);
    lv_obj_set_pos(lyric_current_label, 226, 76);
    lv_label_set_text(lyric_current_label, "播放歌曲后，歌词会在这里横向滚动");

    lyric_next_label = lv_label_create(lyrics_page);
    lv_obj_set_width(lyric_next_label, 405);
    lv_label_set_long_mode(lyric_next_label, LV_LABEL_LONG_SCROLL_CIRCULAR);
    lv_obj_set_style_anim_speed(lyric_next_label, 40, 0);
    lv_obj_set_style_text_align(lyric_next_label, LV_TEXT_ALIGN_LEFT, 0);
    lv_obj_set_style_text_font(lyric_next_label, &lv_font_simsun_16_cjk, 0);
    lv_obj_set_style_text_color(lyric_next_label, lv_color_hex(0x555E6B), 0);
    lv_obj_set_pos(lyric_next_label, 226, 126);
    lv_label_set_text(lyric_next_label, "");

    lv_obj_t *swipe_hint = lv_label_create(lyrics_page);
    lv_label_set_text(swipe_hint, LV_SYMBOL_LEFT " CODEX");
    lv_obj_set_style_text_font(swipe_hint, &lv_font_montserrat_14, 0);
    lv_obj_set_style_text_color(swipe_hint, lv_color_hex(0x555E6B), 0);
    lv_obj_set_pos(swipe_hint, 23, 133);

    update_ui();
}

static void style_lamp(lv_obj_t *lamp, bool active, uint32_t color)
{
    if (active) {
        lv_obj_set_style_bg_color(lamp, lv_color_hex(color), 0);
        lv_obj_set_style_border_color(lamp, lv_color_hex(color), 0);
        lv_obj_set_style_shadow_color(lamp, lv_color_hex(color), 0);
        lv_obj_set_style_shadow_width(lamp, 24, 0);
        lv_obj_set_style_shadow_opa(lamp, LV_OPA_50, 0);
    } else {
        lv_obj_set_style_bg_color(lamp, lv_color_hex(0x151A20), 0);
        lv_obj_set_style_border_color(lamp, lv_color_hex(0x2A313B), 0);
        lv_obj_set_style_shadow_width(lamp, 0, 0);
    }
}

static void update_ui(void)
{
    style_lamp(lamp_red, current_state == CODEX_WAITING, 0xFF3B30);
    style_lamp(lamp_yellow, current_state == CODEX_WORKING, 0xFFD60A);
    style_lamp(lamp_green, current_state == CODEX_DONE, 0x30D158);

    switch (current_state) {
        case CODEX_WAITING:
            lv_label_set_text(status_label, "WAITING");
            lv_label_set_text(detail_label, "YOUR INPUT IS NEEDED");
            break;
        case CODEX_WORKING:
            lv_label_set_text(status_label, "WORKING");
            lv_label_set_text(detail_label, "CODEX IS BUSY");
            break;
        case CODEX_DONE:
            lv_label_set_text(status_label, "DONE");
            lv_label_set_text(detail_label, "READY TO REVIEW");
            break;
        default:
            lv_label_set_text(status_label, "IDLE");
            lv_label_set_text(detail_label, task_count > 0 ? "USB READY / TASKS ACTIVE" : "USB READY / TAP A LIGHT");
            break;
    }
}

void CodexTrafficLight_SetState(const char *state)
{
    if (strcmp(state, "working") == 0 || strcmp(state, "busy") == 0) {
        current_state = CODEX_WORKING;
    } else if (strcmp(state, "waiting") == 0 || strcmp(state, "error") == 0) {
        current_state = CODEX_WAITING;
    } else if (strcmp(state, "done") == 0 || strcmp(state, "complete") == 0) {
        current_state = CODEX_DONE;
    } else {
        current_state = CODEX_IDLE;
    }
    update_ui();
    if (current_state == CODEX_WAITING) {
        lv_obj_set_tile_id(app_view, 0, 0, LV_ANIM_ON);
    }
}

static const char *state_name(void)
{
    switch (current_state) {
        case CODEX_WORKING: return "working";
        case CODEX_WAITING: return "waiting";
        case CODEX_DONE: return "done";
        default: return "idle";
    }
}

static void lamp_event_cb(lv_event_t *event)
{
    current_state = (codex_state_t)(uintptr_t)lv_event_get_user_data(event);
    demo_running = false;
    update_ui();
    printf("OK state=%s source=touch\r\n", state_name());
}

static void idle_event_cb(lv_event_t *event)
{
    (void)event;
    current_state = CODEX_IDLE;
    task_count = 0;
    demo_running = false;
    update_ui();
    printf("OK state=idle source=touch\r\n");
}

static void lowercase(char *text)
{
    for (; *text; ++text) {
        *text = (char)tolower((unsigned char)*text);
    }
}

static bool json_get_string(const char *json, const char *key, char *output, size_t output_size)
{
    char pattern[40];
    snprintf(pattern, sizeof(pattern), "\"%s\"", key);
    const char *cursor = strstr(json, pattern);
    if (cursor == NULL || (cursor = strchr(cursor + strlen(pattern), ':')) == NULL) return false;
    cursor++;
    while (*cursor == ' ' || *cursor == '\t') cursor++;
    if (*cursor++ != '\"') return false;

    size_t length = 0;
    while (*cursor && *cursor != '\"' && length + 1 < output_size) {
        if (*cursor == '\\' && cursor[1]) {
            cursor++;
            if (*cursor == 'n') output[length++] = '\n';
            else if (*cursor == 'r') output[length++] = '\r';
            else if (*cursor == 't') output[length++] = '\t';
            else output[length++] = *cursor;
            cursor++;
        } else {
            output[length++] = *cursor++;
        }
    }
    output[length] = '\0';
    return true;
}

static void handle_serial_line(char *line)
{
    char lower[sizeof(serial_line)];
    strncpy(lower, line, sizeof(lower) - 1);
    lower[sizeof(lower) - 1] = '\0';
    lowercase(lower);

    /* Exact protocol match only: a bare "reboot" could appear in song lyrics. */
    if (strstr(lower, "\"command\":\"reboot\"") != NULL ||
        strstr(lower, "\"command\":\"bootsel\"") != NULL) {
        printf("OK reboot=bootsel\r\n");
        sleep_ms(120); /* let the USB CDC reply drain first */
        reset_usb_boot(0, 0);
    }

    /* Panel self-heal: power-cycle the LCD (PWR_EN off -> on), then hardware
     * reset + register re-init + full redraw. Recovers from white/snow
     * screens without unplugging the board. */
    if (strstr(lower, "\"command\":\"lcdreset\"") != NULL) {
        gpio_put(PIN_PWR_EN, 0);   /* cut panel power */
        sleep_ms(250);              /* let rails discharge */
        gpio_put(PIN_PWR_EN, 1);   /* power the panel back on */
        sleep_ms(250);              /* let rails stabilize */
        LCD_3IN49_Init();           /* RST pulse + register re-init */
        LCD_3IN49_Clear(0x0000);
        if (lv_scr_act() != NULL) lv_obj_invalidate(lv_scr_act());
        printf("OK lcdreset=done\r\n");
        return;
    }

    if (strstr(lower, "\"command\":\"lyrics\"") != NULL || strstr(lower, "\"state\":\"lyrics\"") != NULL) {
        char text[240];
        if (json_get_string(line, "title", text, sizeof(text))) lv_label_set_text(song_label, text);
        if (json_get_string(line, "artist", text, sizeof(text))) lv_label_set_text(artist_label, text);
        if (json_get_string(line, "previous", text, sizeof(text))) lv_label_set_text(lyric_previous_label, text);
        if (json_get_string(line, "line", text, sizeof(text))) lv_label_set_text(lyric_current_label, text);
        if (json_get_string(line, "next", text, sizeof(text))) lv_label_set_text(lyric_next_label, text);
        if (strstr(lower, "\"show\":true") != NULL) lv_obj_set_tile_id(app_view, 1, 0, LV_ANIM_ON);
        printf("OK lyrics=updated\r\n");
        return;
    }

    if (strstr(lower, "demo") != NULL) {
        demo_running = true;
        demo_step = 0;
        demo_next_ms = 0;
        printf("OK demo=started\r\n");
        return;
    }

    const char *count = strstr(lower, "\"count\"");
    if (count != NULL && (count = strchr(count, ':')) != NULL) {
        task_count = atoi(count + 1);
    }

    const char *state = "idle";
    if (strstr(lower, "waiting") != NULL || strstr(lower, "error") != NULL) {
        state = "waiting";
    } else if (strstr(lower, "working") != NULL || strstr(lower, "busy") != NULL) {
        state = "working";
    } else if (strstr(lower, "done") != NULL || strstr(lower, "complete") != NULL) {
        state = "done";
    } else if (strstr(lower, "status") != NULL) {
        printf("STATUS state=%s count=%d\r\n", state_name(), task_count);
        return;
    }

    demo_running = false;
    CodexTrafficLight_SetState(state);
    printf("OK state=%s count=%d\r\n", state_name(), task_count);
}

void CodexTrafficLight_Poll(void)
{
    int ch;
    while ((ch = getchar_timeout_us(0)) != PICO_ERROR_TIMEOUT) {
        if (ch == '\r' || ch == '\n') {
            if (serial_len > 0) {
                serial_line[serial_len] = '\0';
                handle_serial_line(serial_line);
                serial_len = 0;
            }
        } else if (serial_len < sizeof(serial_line) - 1) {
            serial_line[serial_len++] = (char)ch;
        } else {
            serial_len = 0;
        }
    }

    if (demo_running) {
        uint32_t now = to_ms_since_boot(get_absolute_time());
        if (demo_next_ms == 0 || (int32_t)(now - demo_next_ms) >= 0) {
            static const codex_state_t sequence[] = {
                CODEX_WAITING, CODEX_WORKING, CODEX_DONE, CODEX_IDLE
            };
            current_state = sequence[demo_step++];
            update_ui();
            demo_next_ms = now + 900;
            if (demo_step >= sizeof(sequence) / sizeof(sequence[0])) {
                demo_running = false;
            }
        }
    }
}

static void disp_flush_cb(lv_disp_drv_t *disp, const lv_area_t *area, lv_color_t *color_p)
{
    (void)disp;
    (void)area;
    for (int y = 0; y < UI_VER_RES; ++y) {
        for (int x = 0; x < UI_HOR_RES; ++x) {
            buf_rotated[x * UI_VER_RES + (UI_VER_RES - 1 - y)] =
                color_p[y * UI_HOR_RES + x];
        }
    }
    LCD_3IN49_SetWindows(0, 0, DISP_HOR_RES, DISP_VER_RES);
    QSPI_Select(qspi);
    QSPI_Pixel_Write(qspi, 0x2c);
    dma_channel_configure(dma_tx, &c, &qspi.pio->txf[qspi.sm], buf_rotated,
                          UI_HOR_RES * UI_VER_RES * 2,
                          true);
}

static void touch_callback(uint gpio, uint32_t events)
{
    (void)events;
    if (gpio == TOUCH_INT_PIN) {
        Touch_Read_State();
        ts_x = TOUCH.Point1_y > 0 ? TOUCH.Point1_y - 1 : 0;
        if (ts_x >= UI_HOR_RES) ts_x = UI_HOR_RES - 1;
        ts_y = UI_VER_RES - 1 - TOUCH.Point1_x;
        if (ts_y >= UI_VER_RES) ts_y = UI_VER_RES - 1;
        ts_act = LV_INDEV_STATE_PRESSED;
    }
}

static void ts_read_cb(lv_indev_drv_t *drv, lv_indev_data_t *data)
{
    (void)drv;
    data->point.x = ts_x;
    data->point.y = ts_y;
    data->state = ts_act;
    ts_act = LV_INDEV_STATE_RELEASED;
}

static void dma_handler(void)
{
    if (dma_channel_get_irq0_status(dma_tx)) {
        dma_channel_acknowledge_irq0(dma_tx);
        QSPI_Deselect(qspi);
        lv_disp_flush_ready(&disp_drv);
    }
}

static bool repeating_lvgl_timer_callback(struct repeating_timer *t)
{
    (void)t;
    lv_tick_inc(5);
    return true;
}
