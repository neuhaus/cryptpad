
define([
    '/api/config',
    '/common/sframe-channel.js',
    'jquery',
    '/common/sframe-chainpad-netflux-outer.js',
    '/bower_components/nthen/index.js',
    '/common/cryptpad-common.js',
    '/bower_components/chainpad-crypto/crypto.js'
], function (ApiConfig, SFrameChannel, $, CpNfOuter, nThen, Cryptpad, Crypto) {
    console.log('xxx');
    var sframeChan;
    nThen(function (waitFor) {
        $(waitFor());
    }).nThen(function (waitFor) {
        $('#sbox-iframe').attr('src',
            ApiConfig.httpSafeOrigin + '/pad2/inner.html?' + ApiConfig.requireConf.urlArgs);
        SFrameChannel.create($('#sbox-iframe')[0].contentWindow, waitFor(function (sfc) {
            sframeChan = sfc;
            console.log('sframe initialized');
        }));
        Cryptpad.ready(waitFor());
    }).nThen(function (waitFor) {
        var secret = Cryptpad.getSecrets();
        var readOnly = secret.keys && !secret.keys.editKeyStr;
        if (!secret.keys) { secret.keys = secret.key; }
        
        var parsed = Cryptpad.parsePadUrl(window.location.href);
        parsed.type = parsed.type.replace('pad2', 'pad');
        if (!parsed.type) { throw new Error(); }
        var defaultTitle = Cryptpad.getDefaultName(parsed);
        var updateMeta = function () {
            //console.log('EV_METADATA_UPDATE');
            var name;
            nThen(function (waitFor) {
                Cryptpad.getLastName(waitFor(function (n) { name = n }));
            }).nThen(function (waitFor) {
                sframeChan.event('EV_METADATA_UPDATE', {
                    doc: {
                        defaultTitle: defaultTitle,
                        type: parsed.type
                    },
                    user: {
                        name: name,
                        uid: Cryptpad.getUid(),
                        avatar: Cryptpad.getAvatarUrl(),
                        profile: Cryptpad.getProfileUrl(),
                        curvePublic: Cryptpad.getProxy().curvePublic,
                        netfluxId: Cryptpad.getNetwork().webChannels[0].myID,
                    }
                });
            });
        };
        Cryptpad.onDisplayNameChanged(updateMeta);
        sframeChan.onReg('EV_METADATA_UPDATE', updateMeta);

        Cryptpad.onError(function (info) {
            console.log('error');
            console.log(info);
            if (info && info.type === "store") {
                //onConnectError();
            }
        });

        CpNfOuter.start({
            sframeChan: sframeChan,
            channel: secret.channel,
            network: Cryptpad.getNetwork(),
            validateKey: secret.keys.validateKey || undefined,
            readOnly: readOnly,
            crypto: Crypto.createEncryptor(secret.keys),
            onConnect: function (wc) {
                if (readOnly) { return; }
                Cryptpad.replaceHash(Cryptpad.getEditHashFromKeys(wc.id, secret.keys));
            }
        });
    });
});