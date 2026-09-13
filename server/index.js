import { OBS } from "./obs.js";
import { Board } from "./board.js";
import { WebSocketServer } from "ws";
import {
    Encoder,
    Analog,
    Digital,
    EncoderGroup,
    Hold,
    Toggle,
} from "./controls.js";
import * as dotenv from "dotenv";
import {
    set_ascii_filter,
    set_bloom,
    set_blue_sat,
    set_bulge,
    set_foreground,
    set_cartoon_filter,
    set_contrast,
    set_crt_feathering,
    set_crt_strength,
    set_frosted_glass,
    set_gamma,
    set_global_sat,
    set_green_sat,
    set_heat_wave,
    set_hue,
    set_invert,
    set_matrix_filter,
    set_mosaic,
    set_pixelate,
    set_position,
    set_rain_filter,
    set_random_bg,
    set_red_sat,
    set_rotation,
    set_scale_x,
    set_scale_y,
    set_scopes_overlay,
    set_twist,
    set_vhs_filter,
    set_pfxo_visibility,
    set_random_viewport,
    set_viewport_fg,
    set_viewport_bg,
    set_fire_filter,
    set_rotating_cube,
    set_glitch,
    set_thermal,
    set_matrix2_filter,
    set_background,
    set_bg_img,
    set_rgb,
    set_sharpness,
    set_pre_saturation,
    set_ripple,
    set_big_glitch,
    set_rgb_split,
    set_fish_eye,
    set_subpixel,
    set_fg_mask,
} from "./actions.js";
import { choose, hsl_to_rgb, map } from "./util.js";

dotenv.config();

// TODO:
// B28, B29, B32 need 3 "ripple" like effects
// B19-23 need something interesting
// B11-15 need masking effects?
// fix zooming in/out

const wss = new WebSocketServer({
    host: "0.0.0.0",
    port: process.env.CONTROL_SERVER_PORT,
});
const obs = new OBS(process.env.OBS_WS_URL, process.env.OBS_WS_PASSWORD);
const board = new Board();

const encoder_groups = {
    bloom: new EncoderGroup((v) => {
        set_bloom(obs, v);
    }),
    contrast: new EncoderGroup(
        (v) => {
            set_contrast(obs, v);
        },
        { default: 0.5 },
    ),
    global_sat: new EncoderGroup(
        (v) => {
            set_global_sat(obs, v);
        },
        { default: 0.17 },
    ),
    red_sat: new EncoderGroup(
        (v) => {
            set_red_sat(obs, v);
        },
        { default: 0.5 },
    ),
    green_sat: new EncoderGroup(
        (v) => {
            set_green_sat(obs, v);
        },
        { default: 0.5 },
    ),
    blue_sat: new EncoderGroup(
        (v) => {
            set_blue_sat(obs, v);
        },
        { default: 0.5 },
    ),
    hue: new EncoderGroup(
        (v) => {
            set_hue(obs, v);
        },
        { default: 0.5 },
    ),
    gamma: new EncoderGroup(
        (v) => {
            set_gamma(obs, v);
        },
        { default: 0.5 },
    ),
    sharpness: new EncoderGroup((v) => {
        set_sharpness(obs, v);
    }),
    pre_saturation: new EncoderGroup((v) => {
        set_pre_saturation(obs, v);
    }),
};

const shared_state = {
    position: {
        x: 1920 / 2,
        y: 1080 / 2,
    },
    color_multiply: {
        r: 255,
        g: 255,
        b: 255,
    },
    rainbow_timer: null,
};

const controls = {
    P1: encoder_groups.hue.channel(),
    P2: encoder_groups.red_sat.channel(),
    P3: encoder_groups.green_sat.channel(),
    P4: encoder_groups.blue_sat.channel(),
    P5: encoder_groups.sharpness.channel(),
    P6: encoder_groups.pre_saturation.channel(),
    P7: encoder_groups.bloom.channel(),
    P8: encoder_groups.gamma.channel(),
    P9: encoder_groups.hue.channel(),
    P10: encoder_groups.global_sat.channel(),
    P11: new Encoder(
        (v, d) => {
            if (shared_state.position.x < -850 && d < 0) return;
            if (shared_state.position.x > 2800 && d > 0) return;

            shared_state.position.x += map(d, 0, 1, 0, 100);

            set_position(obs, shared_state.position);
        },
        { loop: false, clamp: false },
    ),
    P12: new Encoder(
        (v, d) => {
            if (shared_state.position.y < -450 && d < 0) return;
            if (shared_state.position.y > 1500 && d > 0) return;

            shared_state.position.y += map(d, 0, 1, 0, 100);

            set_position(obs, shared_state.position);
        },
        { loop: false, clamp: false },
    ),
    P13: new Digital((v) => {
        if (v) {
            shared_state.color_multiply.r = 0;
        } else {
            shared_state.color_multiply.r = 255;
        }

        set_rgb(
            obs,
            shared_state.color_multiply.r,
            shared_state.color_multiply.g,
            shared_state.color_multiply.b,
        );
    }),
    P14: new Digital((v) => {
        if (v) {
            shared_state.color_multiply.g = 0;
        } else {
            shared_state.color_multiply.g = 255;
        }

        set_rgb(
            obs,
            shared_state.color_multiply.r,
            shared_state.color_multiply.g,
            shared_state.color_multiply.b,
        );
    }),
    P15: new Digital((v) => {
        if (v) {
            shared_state.color_multiply.b = 0;
        } else {
            shared_state.color_multiply.b = 255;
        }

        set_rgb(
            obs,
            shared_state.color_multiply.r,
            shared_state.color_multiply.g,
            shared_state.color_multiply.b,
        );
    }),
    P16: encoder_groups.global_sat.channel(),
    P17: encoder_groups.gamma.channel(),
    P18: encoder_groups.bloom.channel(),
    P19: encoder_groups.contrast.channel(),
    P20: encoder_groups.hue.channel(),
    P21: new Encoder(
        (v) => {
            set_rotation(obs, v);
        },
        { default: 0.5, sensitivity: 300, loop: false },
    ),
    P22: new Encoder((v) => {
        set_frosted_glass(obs, v);
    }),
    P23: new Encoder((v) => {
        set_heat_wave(obs, v);
    }),
    P24: encoder_groups.red_sat.channel(),
    P25: encoder_groups.green_sat.channel(),
    P26: encoder_groups.blue_sat.channel(),
    P27: new Digital(
        (v) => {
            if (v) set_viewport_fg(obs, "purple");
        },
        { default: true },
    ),
    P28: new Digital((v) => {
        if (v) set_viewport_fg(obs, "green");
    }),
    P29: new Digital((v) => {
        if (v) set_viewport_fg(obs, "blue");
    }),
    P30: new Digital((v) => {
        if (v) set_viewport_fg(obs, "orange");
    }),
    P31: new Encoder(
        (v) => {
            set_twist(obs, v);
        },
        { default: 0.5, loop: false },
    ),
    P32: encoder_groups.contrast.channel(),

    B1: new Digital(
        (v) => {
            if (v) set_foreground(obs, "Camera 1");
        },
        { default: true },
    ),
    B2: new Digital((v) => {
        if (v) set_foreground(obs, "Camera 2");
    }),
    B3: new Digital((v) => {
        if (v) set_foreground(obs, "Camera 3");
    }),
    B4: new Digital((v) => {
        if (v) set_foreground(obs, "Camera 4");
    }),
    B5: new Toggle((v) => {
        set_scopes_overlay(obs, v);
    }),
    B6: new Toggle((v) => {
        controls.B7.value = false;
        if (v) encoder_groups.gamma.control.set(0.8);
        else encoder_groups.gamma.control.set(encoder_groups.gamma.default);
    }),
    B7: new Toggle((v) => {
        controls.B6.value = false;
        if (v) encoder_groups.gamma.control.set(0.2);
        else encoder_groups.gamma.control.set(encoder_groups.gamma.default);
    }),
    B8: new Toggle((v) => {
        if (v) encoder_groups.global_sat.control.set(1);
        else
            encoder_groups.global_sat.control.set(
                encoder_groups.global_sat.default,
            );
    }),
    B9: new Toggle((v) => {
        if (v) encoder_groups.sharpness.control.set(0.8);
        else
            encoder_groups.sharpness.control.set(
                encoder_groups.sharpness.default,
            );
    }),
    B10: new Digital((v) => {
        set_big_glitch(obs, v);
    }),
    B11: new Toggle((v) => {
        if (v) {
            set_fg_mask(obs, "star");
            controls.F12.reset();
            controls.F13.reset();
        } else {
            set_fg_mask(obs, "blank");
            controls.B11.value = false;
            controls.B12.value = false;
            controls.B13.value = false;
            controls.B14.value = false;
            controls.B15.value = false;
        }
    }),
    B12: new Toggle((v) => {
        if (v) {
            set_fg_mask(obs, "heart");
            controls.F12.reset();
            controls.F13.reset();
        } else {
            set_fg_mask(obs, "blank");
            controls.B11.value = false;
            controls.B12.value = false;
            controls.B13.value = false;
            controls.B14.value = false;
            controls.B15.value = false;
        }
    }),
    B13: new Toggle((v) => {
        if (v) {
            var choice = choose([
                "checker",
                "elephant",
                "flower",
                "pacman",
                "sailboat",
                "submarine",
                "tiger",
                "tree",
            ]);
            set_fg_mask(obs, choice);
            controls.F12.reset();
            controls.F13.reset();
        } else {
            set_fg_mask(obs, "blank");
            controls.B11.value = false;
            controls.B12.value = false;
            controls.B13.value = false;
            controls.B14.value = false;
            controls.B15.value = false;
        }
    }),
    B14: new Toggle((v) => {
        if (v) {
            set_fg_mask(obs, "circle");
            controls.F12.reset();
            controls.F13.reset();
        } else {
            set_fg_mask(obs, "blank");
            controls.B11.value = false;
            controls.B12.value = false;
            controls.B13.value = false;
            controls.B14.value = false;
            controls.B15.value = false;
        }
    }),
    B15: new Toggle((v) => {
        if (v) {
            set_fg_mask(obs, "square");
            controls.F12.reset();
            controls.F13.reset();
        } else {
            set_fg_mask(obs, "blank");
            controls.B11.value = false;
            controls.B12.value = false;
            controls.B13.value = false;
            controls.B14.value = false;
            controls.B15.value = false;
        }
    }),
    B16: new Digital((v) => {
        if (v) set_random_encoder_group();
    }),
    B17: new Digital((v) => {
        encoder_groups.sharpness.reset();
        if (v) set_sharpness(obs, 1);
        else set_sharpness(obs, 0);
    }),
    B18: new Digital((v) => {
        encoder_groups.pre_saturation.reset();
        if (v) set_pre_saturation(obs, 1);
        else set_pre_saturation(obs, 0);
    }),
    B19: new Digital((v) => {
        if (v) set_foreground(obs, "Blend 1");
    }),
    B20: new Digital((v) => {
        if (v) set_foreground(obs, "Multiview 2");
    }),
    B21: new Digital((v) => {
        if (v) set_foreground(obs, "Multiview 1");
    }),
    B22: new Digital((v) => {
        if (v) set_foreground(obs, "Multiview 3");
    }),
    B23: new Digital((v) => {
        if (v) set_foreground(obs, "Blend 2");
    }),
    B24: new Digital((v) => {
        if (v) {
            controls.P13.reset();
            controls.P14.reset();
            controls.P15.reset();

            var hue = 0;
            shared_state.rainbow_timer = setInterval(() => {
                var col = hsl_to_rgb(hue % 360, 1, 0.5);
                hue += 5;

                shared_state.color_multiply = {
                    r: col[0],
                    g: col[1],
                    b: col[2],
                };

                set_rgb(
                    obs,
                    shared_state.color_multiply.r,
                    shared_state.color_multiply.g,
                    shared_state.color_multiply.b,
                );
            }, 50);
        } else {
            clearInterval(shared_state.rainbow_timer);

            shared_state.color_multiply = {
                r: 255,
                g: 255,
                b: 255,
            };

            set_rgb(
                obs,
                shared_state.color_multiply.r,
                shared_state.color_multiply.g,
                shared_state.color_multiply.b,
            );
        }
    }),
    B25: new Digital((v) => {
        if (v) {
            set_background(obs, "Background Image");
            set_bg_img(obs, "Minecraft Cave");
        }
    }),
    B26: new Digital((v) => {
        if (v) {
            set_background(obs, "Background Image");
            set_bg_img(obs, "Minecraft Nether");
        }
    }),
    B27: new Digital((v) => {
        if (v) {
            set_background(obs, "Background Image");
            set_bg_img(obs, "Minecraft Overworld");
        }
    }),
    B28: new Digital((v) => {
        set_fish_eye(obs, v);
    }),
    B29: new Digital((v) => {
        set_subpixel(obs, v);
    }),
    B30: new Digital((v) => {
        if (v) {
            reset_random_encoder_group();
            reset_transform();
        }
    }),
    B31: new Digital((v) => {
        set_ripple(obs, v);
    }),
    B32: new Digital((v) => {
        set_rgb_split(obs, v);
    }),
    B33: new Digital((v) => {
        if (v) {
            obs.playMedia("Explosion");
            setTimeout(() => {
                reset();
            }, 1200);
        }
    }),
    B34: new Digital((v) => {
        if (v) set_foreground(obs, "Camera 1");
    }),
    B35: new Digital((v) => {
        if (v) set_foreground(obs, "Camera 2");
    }),
    B36: new Digital((v) => {
        if (v) set_foreground(obs, "Camera 3");
    }),
    B37: new Digital((v) => {
        if (v) set_foreground(obs, "Camera 4");
    }),
    B38: new Digital((v) => {
        if (v) obs.playMedia("Dance");
    }),
    B39: new Digital((v) => {
        if (v) obs.playMedia("Wave");
    }),
    B40: new Digital((v) => {
        if (v) obs.playMedia("Dance");
    }),
    B41: new Digital((v) => {
        if (v) obs.playMedia("Wave");
    }),
    B42: new Digital((v) => {
        set_rotating_cube(obs, v);
    }),
    B43: new Digital((v) => {
        set_glitch(obs, v);
    }),
    B44: new Digital((v) => {
        set_matrix2_filter(obs, v);
    }),
    B45: new Digital((v) => {
        if (v) set_random_bg(obs);
    }),
    B46: new Digital((v) => {
        if (v) set_random_viewport(obs);
    }),
    B47: new Digital(
        (v) => {
            if (v) set_viewport_bg(obs, "purple");
        },
        { default: true },
    ),
    B48: new Digital((v) => {
        if (v) set_viewport_bg(obs, "green");
    }),
    B49: new Digital((v) => {
        if (v) set_viewport_bg(obs, "blue");
    }),
    B50: new Digital((v) => {
        if (v) set_viewport_bg(obs, "orange");
    }),
    B51: new Digital((v) => {
        set_rain_filter(obs, v);
    }),
    B52: new Digital((v) => {
        set_vhs_filter(obs, v);
    }),
    B53: new Digital((v) => {
        set_matrix_filter(obs, v);
    }),
    B54: new Digital(
        (v) => {
            if (v) set_mosaic(obs, 1);
        },
        { default: true },
    ),
    B55: new Digital((v) => {
        if (v) set_mosaic(obs, 2);
    }),
    B56: new Digital((v) => {
        if (v) set_mosaic(obs, 3);
    }),
    B57: new Digital((v) => {
        if (v) set_mosaic(obs, 4);
    }),
    B58: new Digital((v) => {
        if (v) set_mosaic(obs, 5);
    }),
    B59: new Digital((v) => {
        if (v) set_mosaic(obs, 6);
    }),
    B60: new Digital((v) => {
        if (v) set_mosaic(obs, 7);
    }),
    B61: new Digital((v) => {
        if (v) set_mosaic(obs, 8);
    }),

    S1: new Digital((v) => {
        set_pfxo_visibility(obs, 1, v);
    }),
    S2: new Digital((v) => {
        set_pfxo_visibility(obs, 2, v);
    }),
    S3: new Digital((v) => {
        set_pfxo_visibility(obs, 3, v);
    }),
    S4: new Digital((v) => {
        set_pfxo_visibility(obs, 4, v);
    }),
    S5: new Digital((v) => {
        set_pfxo_visibility(obs, 5, v);
    }),
    S6: new Digital((v) => {
        set_pfxo_visibility(obs, 6, v);
    }),
    S7: new Digital((v) => {
        set_pfxo_visibility(obs, 7, v);
    }),
    S8: new Digital((v) => {
        set_pfxo_visibility(obs, 8, v);
    }),
    S9: new Digital((v) => {
        set_cartoon_filter(obs, v);
    }),
    S10: new Digital((v) => {
        set_invert(obs, v * 1);
    }),
    S11: new Digital((v) => {
        set_thermal(obs, v);
    }),
    S12: new Digital((v) => {
        set_ascii_filter(obs, v);
    }),
    S13: new Digital((v) => {
        set_fire_filter(obs, v);
    }),
    F1: new Analog(
        (v) => {
            if (v < 0.1) v = 0;
            set_pixelate(obs, v);
        },
        { min: 255, max: 0 },
    ),
    F2: new Analog((v) => {
        set_bulge(obs, v);
    }),
    F4: new Analog(
        (v) => {
            console.log(v);
            set_scale_x(obs, v);
        },
        { default: 0.5 },
    ),
    F5: new Analog(
        (v) => {
            set_scale_y(obs, v);
        },
        { min: 255, max: 0, default: 0.5 },
    ),
    F12: new Analog(
        (v) => {
            set_crt_strength(obs, v);
            if (v) controls.B11.reset();
        },

        { min: 255, max: 0 },
    ),
    F13: new Analog(
        (v) => {
            set_crt_feathering(obs, v);
            if (v) controls.B11.reset();
        },

        { min: 255, max: 0 },
    ),

    J1: new Hold(() => {
        if (shared_state.position.x < -850) return;
        shared_state.position.x -= 1;
        set_position(obs, shared_state.position);
    }),
    J2: new Hold(() => {
        if (shared_state.position.y < -450) return;
        shared_state.position.y -= 1;
        set_position(obs, shared_state.position);
    }),
    J3: new Hold(() => {
        if (shared_state.position.x > 2800) return;
        shared_state.position.x += 1;
        set_position(obs, shared_state.position);
    }),
    J4: new Hold(() => {
        if (shared_state.position.y > 1500) return;
        shared_state.position.y += 1;
        set_position(obs, shared_state.position);
    }),
};

function reset_random_encoder_group() {
    const candidates = [
        "bloom",
        "contrast",
        "global_sat",
        "hue",
        "gamma",
        "sharpness",
        "pre_saturation",
        "red_sat",
        "green_sat",
        "blue_sat",
    ];

    var non_zero = [];

    for (var i = 0; i < candidates.length; i++) {
        var candidate = encoder_groups[candidates[i]];
        if (candidate.default != candidate.value) {
            non_zero.push(candidate);
        }
    }

    if (non_zero.length > 0) {
        return choose(non_zero).reset();
    }
}

function set_random_encoder_group() {
    const candidates = [
        "global_sat",
        "hue",
        "red_sat",
        "green_sat",
        "blue_sat",
    ];

    encoder_groups[choose(candidates)].control.set(Math.random());
}

function reset() {
    for (const [_, value] of Object.entries(controls)) {
        if (value.reset) {
            value.reset();
        }
    }

    for (const [_, value] of Object.entries(encoder_groups)) {
        if (value.reset) {
            value.reset();
        }
    }

    shared_state.position = {
        x: 1920 / 2,
        y: 1080 / 2,
    };

    shared_state.color_multiply = {
        r: 255,
        g: 255,
        b: 255,
    };

    set_rgb(
        obs,
        shared_state.color_multiply.r,
        shared_state.color_multiply.g,
        shared_state.color_multiply.b,
    );
    set_position(obs, shared_state.position);
}

function reset_transform() {
    controls.P21.reset();
    controls.F4.reset();
    controls.F5.reset();

    shared_state.position = {
        x: 1920 / 2,
        y: 1080 / 2,
    };

    set_position(obs, shared_state.position);
}

obs.on("ready", () => {
    reset();
});

var last_gimmick = -Infinity;
var gimmick_cooldown = 60000;
var gimmick_chance = 0.01;
var gimmick_list = ["Run 1", "Run 2", "Walk Up", "Peek"];
var gimmick_index = 0;

board.onChange((params) => {
    console.log(params);

    for (const [key, value] of Object.entries(params)) {
        if (controls[key]) {
            if (
                (controls[key] instanceof Digital ||
                    controls[key] instanceof Toggle) &&
                value &&
                key[0] !== "J" &&
                key !== "B38" &&
                key !== "B39"
            ) {
                if (
                    Math.random() < gimmick_chance &&
                    Date.now() - last_gimmick > gimmick_cooldown
                ) {
                    last_gimmick = Date.now();
                    obs.playMedia(gimmick_list[gimmick_index]);
                    gimmick_index = (gimmick_index + 1) % gimmick_list.length;
                }
            }

            controls[key].input(value);
        } else {
            if (key == "SPECIAL1" && value) {
                obs.playMedia("Dance");
            }
            if (key == "SPECIAL2" && value) {
                obs.playMedia("Wave");
            }
            if (key == "SPECIAL3" && value) {
                obs.playMedia("Run 1");
            }
            if (key == "SPECIAL4" && value) {
                obs.playMedia("Run 2");
            }
            if (key == "SPECIAL5" && value) {
                obs.playMedia("Walk Up");
            }
            if (key == "SPECIAL6" && value) {
                obs.playMedia("Peek");
            }
        }
    }
});

wss.on("connection", (ws) => {
    ws.on("message", (data) => {
        board.set(JSON.parse(data).params);
        for (const client of wss.clients) {
            if (client.readyState === client.OPEN) {
                client.send(data);
            }
        }
    });
});
