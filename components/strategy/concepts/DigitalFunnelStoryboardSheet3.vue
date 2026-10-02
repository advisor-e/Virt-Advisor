<template lang="pug">
  .scg.
    <svg viewBox="0 0 1500 844" role="img"
               aria-label="Digital Funnel Storyboard: Digital (New Client) On-Boarding as an &#8216;Engagement Story-Board&#8217; -2">

            <rect x="0" y="0" width="1500" height="844" fill="#ffffff"></rect>

            <!-- The firm's mark, standing exactly where advisor-e.com was burned in. -->
            <g class="firm-mark">
              <image class="fm-logo" x="103" y="778" width="240" height="44" preserveAspectRatio="xMinYMid meet" v-if="firmLogo" :href="firmLogo"></image>
              <circle class="fm-disc" cx="125" cy="800" r="22" v-if="!firmLogo" :fill="firmColour"></circle>
              <text class="fm-init" v-if="!firmLogo" x="125" y="808" text-anchor="middle" fill="#fff"
                    font-family="Open Sans, sans-serif" font-size="20" font-weight="700">{{ firmInitial }}</text>
              <text class="fm-name" v-if="!firmLogo" x="159" y="807" fill="#002B64"
                    font-family="Open Sans, sans-serif" font-size="21" font-weight="600">{{ firmName }}</text>
            </g>

            <path d="M 34.97 79.75 L 1464.01 79.75 L 1464.01 813.14 L 34.97 813.14 L 34.97 79.75" fill="#F0F0F0"></path>
            <path d="M 34.97 79.75 L 164.69 79.75 L 164.69 160.4 L 34.97 160.4 L 34.97 79.75" fill="#002B64"></path>
            <path d="M 164.69 79.75 L 348.14 79.75 L 348.14 160.4 L 164.69 160.4 L 164.69 79.75" fill="#002B64"></path>
            <path d="M 348.14 79.75 L 538.68 79.75 L 538.68 160.4 L 348.14 160.4 L 348.14 79.75" fill="#002B64"></path>
            <path d="M 538.68 79.75 L 734.79 79.75 L 734.79 160.4 L 538.68 160.4 L 538.68 79.75" fill="#002B64"></path>
            <path d="M 734.79 79.75 L 928.12 79.75 L 928.12 160.4 L 734.79 160.4 L 734.79 79.75" fill="#002B64"></path>
            <path d="M 928.12 79.75 L 1106.75 79.75 L 1106.75 160.4 L 928.12 160.4 L 928.12 79.75" fill="#002B64"></path>
            <path d="M 1106.75 79.75 L 1285.38 79.75 L 1285.38 160.4 L 1106.75 160.4 L 1106.75 79.75" fill="#002B64"></path>
            <path d="M 1285.38 79.75 L 1464.01 79.75 L 1464.01 160.4 L 1285.38 160.4 L 1285.38 79.75" fill="#002B64"></path>
            <path d="M 34.97 160.4 L 164.69 160.4 L 164.69 274.96 L 34.97 274.96 L 34.97 160.4" fill="#666666"></path>
            <path d="M 164.69 160.4 L 348.14 160.4 L 348.14 274.96 L 164.69 274.96 L 164.69 160.4" fill="#666666"></path>
            <path d="M 348.14 160.4 L 538.68 160.4 L 538.68 274.96 L 348.14 274.96 L 348.14 160.4" fill="#666666"></path>
            <path d="M 538.68 160.4 L 734.79 160.4 L 734.79 274.96 L 538.68 274.96 L 538.68 160.4" fill="#666666"></path>
            <path d="M 734.79 160.4 L 928.12 160.4 L 928.12 274.96 L 734.79 274.96 L 734.79 160.4" fill="#666666"></path>
            <path d="M 928.12 160.4 L 1106.75 160.4 L 1106.75 274.96 L 928.12 274.96 L 928.12 160.4" fill="#666666"></path>
            <path d="M 1106.75 160.4 L 1285.38 160.4 L 1285.38 274.96 L 1106.75 274.96 L 1106.75 160.4" fill="#666666"></path>
            <path d="M 1285.38 160.4 L 1464.01 160.4 L 1464.01 274.96 L 1285.38 274.96 L 1285.38 160.4" fill="#666666"></path>
            <path d="M 34.97 274.96 L 164.69 274.96 L 164.69 374.42 L 34.97 374.42 L 34.97 274.96" fill="#3A3838"></path>
            <path d="M 164.69 274.96 L 348.14 274.96 L 348.14 374.42 L 164.69 374.42 L 164.69 274.96" fill="#3A3838"></path>
            <path d="M 348.14 274.96 L 538.68 274.96 L 538.68 374.42 L 348.14 374.42 L 348.14 274.96" fill="#3A3838"></path>
            <path d="M 538.68 274.96 L 734.79 274.96 L 734.79 374.42 L 538.68 374.42 L 538.68 274.96" fill="#3A3838"></path>
            <path d="M 734.79 274.96 L 928.12 274.96 L 928.12 374.42 L 734.79 374.42 L 734.79 274.96" fill="#3A3838"></path>
            <path d="M 928.12 274.96 L 1106.75 274.96 L 1106.75 374.42 L 928.12 374.42 L 928.12 274.96" fill="#3A3838"></path>
            <path d="M 1106.75 274.96 L 1285.38 274.96 L 1285.38 374.42 L 1106.75 374.42 L 1106.75 274.96" fill="#3A3838"></path>
            <path d="M 1285.38 274.96 L 1464.01 274.96 L 1464.01 374.42 L 1285.38 374.42 L 1285.38 274.96" fill="#3A3838"></path>
            <path d="M 34.97 374.42 L 164.69 374.42 L 164.69 494.54 L 34.97 494.54 L 34.97 374.42" fill="#666666"></path>
            <path d="M 164.69 374.42 L 348.14 374.42 L 348.14 494.54 L 164.69 494.54 L 164.69 374.42" fill="#666666"></path>
            <path d="M 348.14 374.42 L 538.68 374.42 L 538.68 494.54 L 348.14 494.54 L 348.14 374.42" fill="#666666"></path>
            <path d="M 538.68 374.42 L 734.79 374.42 L 734.79 494.54 L 538.68 494.54 L 538.68 374.42" fill="#666666"></path>
            <path d="M 734.79 374.42 L 928.12 374.42 L 928.12 494.54 L 734.79 494.54 L 734.79 374.42" fill="#666666"></path>
            <path d="M 928.12 374.42 L 1106.75 374.42 L 1106.75 494.54 L 928.12 494.54 L 928.12 374.42" fill="#666666"></path>
            <path d="M 1106.75 374.42 L 1285.38 374.42 L 1285.38 494.54 L 1106.75 494.54 L 1106.75 374.42" fill="#666666"></path>
            <path d="M 1285.38 374.42 L 1464.01 374.42 L 1464.01 494.54 L 1285.38 494.54 L 1285.38 374.42" fill="#666666"></path>
            <path d="M 34.97 494.54 L 164.69 494.54 L 164.69 614.22 L 34.97 614.22 L 34.97 494.54" fill="#3A3838"></path>
            <path d="M 164.69 494.54 L 348.14 494.54 L 348.14 614.22 L 164.69 614.22 L 164.69 494.54" fill="#3A3838"></path>
            <path d="M 348.14 494.54 L 538.68 494.54 L 538.68 614.22 L 348.14 614.22 L 348.14 494.54" fill="#3A3838"></path>
            <path d="M 538.68 494.54 L 734.79 494.54 L 734.79 614.22 L 538.68 614.22 L 538.68 494.54" fill="#3A3838"></path>
            <path d="M 734.79 494.54 L 928.12 494.54 L 928.12 614.22 L 734.79 614.22 L 734.79 494.54" fill="#3A3838"></path>
            <path d="M 928.12 494.54 L 1106.75 494.54 L 1106.75 614.22 L 928.12 614.22 L 928.12 494.54" fill="#3A3838"></path>
            <path d="M 1106.75 494.54 L 1285.38 494.54 L 1285.38 614.22 L 1106.75 614.22 L 1106.75 494.54" fill="#3A3838"></path>
            <path d="M 1285.38 494.54 L 1464.01 494.54 L 1464.01 614.22 L 1285.38 614.22 L 1285.38 494.54" fill="#3A3838"></path>
            <path d="M 34.97 614.22 L 164.69 614.22 L 164.69 713.68 L 34.97 713.68 L 34.97 614.22" fill="#666666"></path>
            <path d="M 164.69 614.22 L 348.14 614.22 L 348.14 713.68 L 164.69 713.68 L 164.69 614.22" fill="#666666"></path>
            <path d="M 348.14 614.22 L 538.68 614.22 L 538.68 713.68 L 348.14 713.68 L 348.14 614.22" fill="#666666"></path>
            <path d="M 538.68 614.22 L 734.79 614.22 L 734.79 713.68 L 538.68 713.68 L 538.68 614.22" fill="#666666"></path>
            <path d="M 734.79 614.22 L 928.12 614.22 L 928.12 713.68 L 734.79 713.68 L 734.79 614.22" fill="#666666"></path>
            <path d="M 928.12 614.22 L 1106.75 614.22 L 1106.75 713.68 L 928.12 713.68 L 928.12 614.22" fill="#666666"></path>
            <path d="M 1106.75 614.22 L 1285.38 614.22 L 1285.38 713.68 L 1106.75 713.68 L 1106.75 614.22" fill="#666666"></path>
            <path d="M 1285.38 614.22 L 1464.01 614.22 L 1464.01 713.68 L 1285.38 713.68 L 1285.38 614.22" fill="#666666"></path>
            <path d="M 34.97 713.68 L 164.69 713.68 L 164.69 813.14 L 34.97 813.14 L 34.97 713.68" fill="#3A3838"></path>
            <path d="M 164.69 713.68 L 348.14 713.68 L 348.14 813.14 L 164.69 813.14 L 164.69 713.68" fill="#3A3838"></path>
            <path d="M 348.14 713.68 L 538.68 713.68 L 538.68 813.14 L 348.14 813.14 L 348.14 713.68" fill="#3A3838"></path>
            <path d="M 538.68 713.68 L 734.79 713.68 L 734.79 813.14 L 538.68 813.14 L 538.68 713.68" fill="#3A3838"></path>
            <path d="M 734.79 713.68 L 928.12 713.68 L 928.12 813.14 L 734.79 813.14 L 734.79 713.68" fill="#3A3838"></path>
            <path d="M 928.12 713.68 L 1106.75 713.68 L 1106.75 813.14 L 928.12 813.14 L 928.12 713.68" fill="#3A3838"></path>
            <path d="M 1106.75 713.68 L 1285.38 713.68 L 1285.38 813.14 L 1106.75 813.14 L 1106.75 713.68" fill="#3A3838"></path>
            <path d="M 1285.38 713.68 L 1464.01 713.68 L 1464.01 813.14 L 1285.38 813.14 L 1285.38 713.68" fill="#3A3838"></path>
            <path d="M 34.97 78.97 L 34.97 813.92" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 164.69 78.97 L 164.69 813.92" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 348.14 78.97 L 348.14 813.92" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 538.68 78.97 L 538.68 813.92" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 734.79 78.97 L 734.79 813.92" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 928.12 78.97 L 928.12 813.92" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 1106.75 78.97 L 1106.75 813.92" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 1285.38 78.97 L 1285.38 813.92" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 1464.01 78.97 L 1464.01 813.92" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 34.19 79.75 L 1464.78 79.75" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 34.19 160.4 L 1464.78 160.4" fill="none" stroke="#FFFFFF" stroke-width="6.25"></path>
            <path d="M 34.19 274.96 L 1464.78 274.96" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 34.19 374.42 L 1464.78 374.42" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 34.19 494.54 L 1464.78 494.54" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 34.19 614.22 L 1464.78 614.22" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 34.19 713.68 L 1464.78 713.68" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <path d="M 34.19 813.14 L 1464.78 813.14" fill="none" stroke="#FFFFFF" stroke-width="2.08"></path>
            <g font-family="Open Sans, sans-serif">
              <text x="70.69" y="115.76" font-size="16.67" font-weight="700" fill="#FFFFFF" xml:space="preserve" textLength="62.63" lengthAdjust="spacing">Cost to </text>
              <text x="59.27" y="136.07" font-size="16.67" font-weight="700" fill="#FFFFFF" textLength="81.15" lengthAdjust="spacing">Customer</text>
              <text x="222.19" y="125.92" font-size="16.67" font-weight="700" fill="#FFFFFF" textLength="68.45" lengthAdjust="spacing">Medium</text>
              <text x="398.43" y="115.76" font-size="16.67" font-weight="700" fill="#FFFFFF" textLength="89.97" lengthAdjust="spacing">How to get</text>
              <text x="395.62" y="136.07" font-size="16.67" font-weight="700" fill="#9CC2E5" textLength="95.6" lengthAdjust="spacing">ATTENTION</text>
              <text x="572.63" y="115.76" font-size="16.67" font-weight="700" fill="#FFFFFF" textLength="128.25" lengthAdjust="spacing">How to capture</text>
              <text x="598.16" y="136.07" font-size="16.67" font-weight="700" fill="#F4B081" textLength="77.18" lengthAdjust="spacing">INTEREST</text>
              <text x="769.34" y="115.76" font-size="16.67" font-weight="700" fill="#FFFFFF" xml:space="preserve" textLength="70.53" lengthAdjust="spacing">What to </text>
              <text x="839.85" y="115.76" font-size="16.67" font-weight="700" fill="#A8D08C" textLength="53.73" lengthAdjust="spacing">SHARE</text>
              <text x="786.20" y="136.07" font-size="16.67" font-weight="700" fill="#FFFFFF" xml:space="preserve" textLength="90.52" lengthAdjust="spacing"> with them</text>
              <text x="1002.22" y="105.61" font-size="16.67" font-weight="700" fill="#FFFFFF" xml:space="preserve" textLength="34.75" lengthAdjust="spacing">The </text>
              <text x="985.41" y="125.92" font-size="16.67" font-weight="700" fill="#CC3300" textLength="64.05" lengthAdjust="spacing">ACTION</text>
              <text x="976.60" y="146.23" font-size="16.67" font-weight="700" fill="#FFFFFF" textLength="81.68" lengthAdjust="spacing">They take</text>
              <text x="1151.40" y="105.61" font-size="16.67" font-weight="700" fill="#FFFFFF" textLength="89.37" lengthAdjust="spacing">So You can</text>
              <text x="1180.55" y="125.92" font-size="16.67" font-weight="700" fill="#CCCC00" textLength="31.05" lengthAdjust="spacing">GET</text>
              <text x="1174.82" y="146.23" font-size="16.67" font-weight="700" fill="#FFFFFF" textLength="42.5" lengthAdjust="spacing">what</text>
              <text x="1355.09" y="115.76" font-size="16.67" font-weight="700" fill="#FFFFFF" textLength="39.23" lengthAdjust="spacing">Your</text>
              <text x="1307.48" y="136.07" font-size="16.67" font-weight="700" fill="#00FFCC" textLength="134.47" lengthAdjust="spacing">DESIRED RESULT</text>
              <text x="82.78" y="223.52" font-size="16.67" fill="#FFFFFF" textLength="34.1" lengthAdjust="spacing">Free</text>
              <text x="177.94" y="213.36" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="161.27" lengthAdjust="spacing">Facebook Instagram </text>
              <text x="220.61" y="233.68" font-size="16.67" fill="#FFFFFF" textLength="71.6" lengthAdjust="spacing">Linked-In</text>
              <text x="365.77" y="213.36" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="83.13" lengthAdjust="spacing">5 Reasons </text>
              <text x="448.92" y="213.36" font-size="16.67" font-weight="700" fill="#9CC2E5" textLength="39.25" lengthAdjust="spacing">WHY</text>
              <text x="488.15" y="213.36" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="37.2" lengthAdjust="spacing"> you </text>
              <text x="362.13" y="233.68" font-size="16.67" fill="#FFFFFF" textLength="162.52" lengthAdjust="spacing">Should STOP Doing...</text>
              <text x="594.40" y="213.36" font-size="16.67" fill="#FFFFFF" textLength="84.65" lengthAdjust="spacing">BECAUSE...</text>
              <text x="565.18" y="233.68" font-size="16.67" fill="#FFFFFF" textLength="143.08" lengthAdjust="spacing">You Could Suffer...</text>
              <text x="748.15" y="186.02" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="116.63" lengthAdjust="spacing">FREE Guide on </text>
              <text x="864.79" y="186.02" font-size="16.67" font-weight="700" fill="#9CC2E5" textLength="49.98" lengthAdjust="spacing">WHAT</text>
              <text x="823.48" y="206.33" font-size="16.67" fill="#FFFFFF" textLength="15.95" lengthAdjust="spacing">to</text>
              <text x="784.62" y="226.65" font-size="16.67" fill="#FFFFFF" textLength="93.65" lengthAdjust="spacing">Do different</text>
              <text x="749.60" y="244.96" font-size="14.58" fill="#FFD966" xml:space="preserve" textLength="167.36" lengthAdjust="spacing">(and the role you play in </text>
              <text x="804.18" y="262.15" font-size="14.58" fill="#FFD966" textLength="54.51" lengthAdjust="spacing">helping)</text>
              <text x="971.50" y="214.93" font-size="16.67" fill="#FFFFFF" textLength="91.85" lengthAdjust="spacing">Click on link</text>
              <text x="947.45" y="233.24" font-size="14.58" fill="#FFFFFF" textLength="139.87" lengthAdjust="spacing">(Give you their TIME)</text>
              <text x="1119.20" y="213.36" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="158.0" lengthAdjust="spacing">Their Name &amp; Email </text>
              <text x="1164.60" y="233.68" font-size="16.67" fill="#FFFFFF" textLength="62.92" lengthAdjust="spacing">Address</text>
              <text x="1296.37" y="203.21" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="160.9" lengthAdjust="spacing">Build an email list of </text>
              <text x="1327.30" y="223.52" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="99.08" lengthAdjust="spacing">INTERESTED </text>
              <text x="1336.53" y="243.83" font-size="16.67" fill="#FFFFFF" textLength="76.32" lengthAdjust="spacing">prospects</text>
              <text x="68.06" y="320.37" font-size="16.67" fill="#FFFFFF" textLength="63.53" lengthAdjust="spacing">Tiny Fee</text>
              <text x="80.64" y="340.69" font-size="16.67" fill="#FFFFFF" textLength="38.35" lengthAdjust="spacing">($37)</text>
              <text x="177.94" y="320.37" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="161.27" lengthAdjust="spacing">Facebook Instagram </text>
              <text x="220.61" y="340.69" font-size="16.67" fill="#FFFFFF" textLength="71.6" lengthAdjust="spacing">Linked-In</text>
              <text x="367.48" y="320.37" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="156.13" lengthAdjust="spacing">6 Things Others are </text>
              <text x="366.24" y="340.69" font-size="16.67" font-weight="700" fill="#F4B081" textLength="56.7" lengthAdjust="spacing">DOING</text>
              <text x="422.92" y="340.69" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="97.63" lengthAdjust="spacing"> to Achieve...</text>
              <text x="560.36" y="320.37" font-size="16.67" font-weight="700" fill="#F4B081" textLength="49.98" lengthAdjust="spacing">WHAT</text>
              <text x="610.32" y="320.37" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="24.58" lengthAdjust="spacing"> to </text>
              <text x="634.92" y="320.37" font-size="16.67" font-weight="700" fill="#F4B081" textLength="32.7" lengthAdjust="spacing">AIM</text>
              <text x="667.62" y="320.37" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="49.78" lengthAdjust="spacing"> for in </text>
              <text x="587.32" y="340.69" font-size="16.67" fill="#FFFFFF" textLength="98.82" lengthAdjust="spacing">your journey</text>
              <text x="751.82" y="320.37" font-size="16.67" font-weight="700" fill="#F4B081" textLength="49.98" lengthAdjust="spacing">WHAT</text>
              <text x="801.78" y="320.37" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="113.62" lengthAdjust="spacing"> success steps </text>
              <text x="804.67" y="340.69" font-size="16.67" fill="#FFFFFF" textLength="53.55" lengthAdjust="spacing">to take</text>
              <text x="981.55" y="313.34" font-size="16.67" fill="#FFFFFF" textLength="71.77" lengthAdjust="spacing">Purchase</text>
              <text x="968.14" y="331.65" font-size="14.58" fill="#FFFFFF" xml:space="preserve" textLength="102.29" lengthAdjust="spacing">(Give you their </text>
              <text x="989.45" y="348.84" font-size="14.58" fill="#FFFFFF" textLength="55.94" lengthAdjust="spacing">MONEY)</text>
              <text x="1129.55" y="310.22" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="137.32" lengthAdjust="spacing">Funds to support </text>
              <text x="1155.04" y="330.53" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="86.35" lengthAdjust="spacing">ROI advert </text>
              <text x="1158.29" y="350.84" font-size="16.67" fill="#FFFFFF" textLength="75.53" lengthAdjust="spacing">campaign</text>
              <text x="1324.85" y="300.06" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="103.95" lengthAdjust="spacing">Build a list of </text>
              <text x="1326.39" y="320.37" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="100.9" lengthAdjust="spacing">prospects to </text>
              <text x="1320.35" y="340.69" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="112.95" lengthAdjust="spacing">COLLECT data </text>
              <text x="1351.89" y="361.00" font-size="16.67" fill="#FFFFFF" textLength="45.6" lengthAdjust="spacing">about</text>
              <text x="62.92" y="430.16" font-size="16.67" fill="#FFFFFF" textLength="73.82" lengthAdjust="spacing">Small Fee</text>
              <text x="75.88" y="450.48" font-size="16.67" fill="#FFFFFF" textLength="47.87" lengthAdjust="spacing">($149)</text>
              <text x="177.94" y="430.16" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="161.27" lengthAdjust="spacing">Facebook Instagram </text>
              <text x="220.61" y="450.48" font-size="16.67" fill="#FFFFFF" textLength="71.6" lengthAdjust="spacing">Linked-In</text>
              <text x="361.23" y="420.01" font-size="16.67" font-weight="700" fill="#FFD966" textLength="42.1" lengthAdjust="spacing">HOW</text>
              <text x="403.32" y="420.01" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="126.57" lengthAdjust="spacing"> to SAVE TIME &amp; </text>
              <text x="374.71" y="440.32" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="141.72" lengthAdjust="spacing">MONEY Achieving </text>
              <text x="424.42" y="460.63" font-size="16.67" fill="#FFFFFF" textLength="37.95" lengthAdjust="spacing">xyz...</text>
              <text x="567.01" y="430.16" font-size="16.67" font-weight="700" fill="#FFD966" xml:space="preserve" textLength="143.78" lengthAdjust="spacing">If YOU&#8217;RE at THIS </text>
              <text x="549.94" y="450.48" font-size="16.67" font-weight="700" fill="#FFD966" xml:space="preserve" textLength="56.02" lengthAdjust="spacing">STAGE </text>
              <text x="605.95" y="450.48" font-size="16.67" fill="#FFFFFF" textLength="117.55" lengthAdjust="spacing">in your journey</text>
              <text x="768.80" y="420.01" font-size="16.67" font-weight="700" fill="#FFD966" textLength="42.1" lengthAdjust="spacing">HOW</text>
              <text x="810.88" y="420.01" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="87.52" lengthAdjust="spacing"> to do &#8216;XYZ&#8217; </text>
              <text x="808.01" y="440.32" font-size="16.67" fill="#FFFFFF" textLength="46.88" lengthAdjust="spacing">easier</text>
              <text x="786.35" y="460.63" font-size="16.67" fill="#FFFFFF" textLength="90.17" lengthAdjust="spacing">(entry level)</text>
              <text x="981.55" y="431.73" font-size="16.67" fill="#FFFFFF" textLength="71.77" lengthAdjust="spacing">Purchase</text>
              <text x="942.27" y="450.04" font-size="14.58" fill="#FFFFFF" textLength="150.24" lengthAdjust="spacing">(Give you their TRUST)</text>
              <text x="1141.11" y="420.01" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="114.2" lengthAdjust="spacing">More funds to </text>
              <text x="1122.24" y="440.32" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="151.93" lengthAdjust="spacing">support ROI advert </text>
              <text x="1158.29" y="460.63" font-size="16.67" fill="#FFFFFF" textLength="75.53" lengthAdjust="spacing">campaign</text>
              <text x="1314.60" y="420.01" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="124.43" lengthAdjust="spacing">Build a list of &#8216;A&#8217; </text>
              <text x="1301.91" y="440.32" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="149.83" lengthAdjust="spacing">grade prospects to </text>
              <text x="1312.92" y="460.63" font-size="16.67" fill="#FFFFFF" textLength="123.52" lengthAdjust="spacing">Skype Chat with</text>
              <text x="50.70" y="550.07" font-size="16.67" fill="#FFFFFF" textLength="98.23" lengthAdjust="spacing">Target Client</text>
              <text x="57.94" y="570.38" font-size="16.67" fill="#FFFFFF" textLength="83.75" lengthAdjust="spacing">($175 mth)</text>
              <text x="198.40" y="550.07" font-size="16.67" fill="#FFFFFF" textLength="116.02" lengthAdjust="spacing">Past Purchaser</text>
              <text x="225.60" y="570.38" font-size="16.67" fill="#FFFFFF" textLength="61.63" lengthAdjust="spacing">Referral</text>
              <text x="383.53" y="550.07" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="124.03" lengthAdjust="spacing">Direct Email for </text>
              <text x="381.90" y="570.38" font-size="16.67" fill="#FFFFFF" textLength="123.0" lengthAdjust="spacing">Skype Invitation</text>
              <text x="557.48" y="550.07" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="162.8" lengthAdjust="spacing">FREE 30 min &#8216;chat&#8217; to </text>
              <text x="568.51" y="570.38" font-size="16.67" fill="#FFFFFF" textLength="136.42" lengthAdjust="spacing">help them learn...</text>
              <text x="747.85" y="541.47" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="171.5" lengthAdjust="spacing">PERSONAL steps they </text>
              <text x="745.96" y="561.78" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="82.47" lengthAdjust="spacing">can take... </text>
              <text x="828.45" y="561.78" font-size="14.58" font-weight="700" fill="#A8D08C" xml:space="preserve" textLength="92.24" lengthAdjust="spacing">(Tell &amp; Show </text>
              <text x="808.51" y="580.10" font-size="14.58" font-weight="700" fill="#A8D08C" textLength="45.86" lengthAdjust="spacing">Them)</text>
              <text x="981.55" y="543.03" font-size="16.67" fill="#FFFFFF" textLength="71.77" lengthAdjust="spacing">Purchase</text>
              <text x="968.14" y="561.35" font-size="14.58" fill="#FFFFFF" xml:space="preserve" textLength="102.29" lengthAdjust="spacing">(Give you their </text>
              <text x="970.49" y="578.53" font-size="14.58" fill="#FFFFFF" textLength="93.86" lengthAdjust="spacing">ADMIRATION)</text>
              <text x="1126.81" y="539.91" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="142.82" lengthAdjust="spacing">Reasonable funds </text>
              <text x="1128.40" y="560.22" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="139.62" lengthAdjust="spacing">towards business </text>
              <text x="1164.26" y="580.53" font-size="16.67" fill="#FFFFFF" textLength="63.6" lengthAdjust="spacing">revenue</text>
              <text x="1302.15" y="539.91" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="149.38" lengthAdjust="spacing">Income + potential </text>
              <text x="1328.69" y="560.22" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="96.28" lengthAdjust="spacing">to up-sell to </text>
              <text x="1319.11" y="580.53" font-size="16.67" fill="#FFFFFF" textLength="111.15" lengthAdjust="spacing">Premium level</text>
              <text x="47.44" y="652.61" font-size="16.67" fill="#FFFFFF" textLength="104.78" lengthAdjust="spacing">Golden Client</text>
              <text x="58.22" y="670.92" font-size="14.58" fill="#FFFFFF" xml:space="preserve" textLength="86.9" lengthAdjust="spacing">($500- 1,000 </text>
              <text x="83.87" y="688.11" font-size="14.58" fill="#FFFFFF" textLength="31.91" lengthAdjust="spacing">mth)</text>
              <text x="198.40" y="659.64" font-size="16.67" fill="#FFFFFF" textLength="116.02" lengthAdjust="spacing">Past Purchaser</text>
              <text x="225.60" y="679.95" font-size="16.67" fill="#FFFFFF" textLength="61.63" lengthAdjust="spacing">Referral</text>
              <text x="397.71" y="669.79" font-size="16.67" fill="#FFFFFF" textLength="91.38" lengthAdjust="spacing">Past service</text>
              <text x="599.03" y="639.32" font-size="16.67" fill="#FFFFFF" textLength="75.38" lengthAdjust="spacing">Tell Them</text>
              <text x="591.37" y="659.64" font-size="16.67" fill="#FFFFFF" textLength="90.73" lengthAdjust="spacing">Show Them</text>
              <text x="591.51" y="679.95" font-size="16.67" font-weight="700" fill="#F4B081" textLength="90.47" lengthAdjust="spacing">With Them</text>
              <text x="599.79" y="700.26" font-size="16.67" fill="#FFFFFF" textLength="73.88" lengthAdjust="spacing">For Them</text>
              <text x="749.93" y="659.64" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="167.35" lengthAdjust="spacing">Greater COMPLEXITY </text>
              <text x="793.67" y="679.95" font-size="16.67" fill="#FFFFFF" textLength="75.55" lengthAdjust="spacing">Explained</text>
              <text x="947.97" y="661.20" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="76.08" lengthAdjust="spacing">Purchase </text>
              <text x="1024.06" y="661.20" font-size="14.58" fill="#FFFFFF" xml:space="preserve" textLength="66.57" lengthAdjust="spacing">(Give you </text>
              <text x="944.64" y="679.51" font-size="14.58" fill="#FFFFFF" textLength="145.51" lengthAdjust="spacing">their VULNERABILITY)</text>
              <text x="1158.28" y="659.64" font-size="16.67" fill="#FFFFFF" textLength="75.55" lengthAdjust="spacing">Profitable</text>
              <text x="1167.25" y="679.95" font-size="16.67" fill="#FFFFFF" textLength="57.63" lengthAdjust="spacing">Income</text>
              <text x="1308.43" y="659.64" font-size="16.67" fill="#FFFFFF" textLength="132.53" lengthAdjust="spacing">Meaningful Work</text>
              <text x="1303.55" y="679.95" font-size="16.67" fill="#FFFFFF" textLength="142.27" lengthAdjust="spacing">Leveraged Income</text>
              <text x="64.12" y="743.47" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="75.73" lengthAdjust="spacing">Premium </text>
              <text x="77.64" y="763.78" font-size="16.67" fill="#FFFFFF" textLength="44.38" lengthAdjust="spacing">Client</text>
              <text x="57.09" y="780.10" font-size="12.5" fill="#FFFFFF" xml:space="preserve" textLength="88.59" lengthAdjust="spacing">($2,000 mth or </text>
              <text x="82.38" y="795.72" font-size="12.5" fill="#FFFFFF" textLength="34.86" lengthAdjust="spacing">more)</text>
              <text x="198.40" y="759.10" font-size="16.67" fill="#FFFFFF" textLength="116.02" lengthAdjust="spacing">Past Purchaser</text>
              <text x="225.60" y="779.41" font-size="16.67" fill="#FFFFFF" textLength="61.63" lengthAdjust="spacing">Referral</text>
              <text x="397.71" y="769.25" font-size="16.67" fill="#FFFFFF" textLength="91.38" lengthAdjust="spacing">Past service</text>
              <text x="599.03" y="738.78" font-size="16.67" fill="#FFFFFF" textLength="75.38" lengthAdjust="spacing">Tell Them</text>
              <text x="591.37" y="759.10" font-size="16.67" fill="#FFFFFF" textLength="90.73" lengthAdjust="spacing">Show Them</text>
              <text x="594.64" y="779.41" font-size="16.67" fill="#FFFFFF" textLength="84.2" lengthAdjust="spacing">With Them</text>
              <text x="597.68" y="799.72" font-size="16.67" font-weight="700" fill="#FFD966" textLength="78.12" lengthAdjust="spacing">For Them</text>
              <text x="758.32" y="759.10" font-size="16.67" fill="#FFFFFF" xml:space="preserve" textLength="150.58" lengthAdjust="spacing">Increased HANDS - </text>
              <text x="768.56" y="779.41" font-size="16.67" fill="#FFFFFF" textLength="125.78" lengthAdjust="spacing">ON Involvement</text>
              <text x="952.83" y="762.31" font-size="20.83" fill="#FFFFFF" xml:space="preserve" textLength="95.1" lengthAdjust="spacing">Purchase </text>
              <text x="1047.99" y="762.31" font-size="14.58" fill="#FFFFFF" xml:space="preserve" textLength="37.8" lengthAdjust="spacing">(Give </text>
              <text x="945.24" y="781.31" font-size="14.58" fill="#FFFFFF" textLength="144.3" lengthAdjust="spacing">you their ADVOCACY)</text>
              <text x="1158.28" y="759.10" font-size="16.67" fill="#FFFFFF" textLength="75.55" lengthAdjust="spacing">Profitable</text>
              <text x="1167.25" y="779.41" font-size="16.67" fill="#FFFFFF" textLength="57.63" lengthAdjust="spacing">Income</text>
              <text x="1308.43" y="759.10" font-size="16.67" fill="#FFFFFF" textLength="132.53" lengthAdjust="spacing">Meaningful Work</text>
              <text x="1303.55" y="779.41" font-size="16.67" fill="#FFFFFF" textLength="142.27" lengthAdjust="spacing">Leveraged Income</text>
              <text x="38.83" y="63.38" font-size="37.5" fill="#002B64" xml:space="preserve" textLength="673.61" lengthAdjust="spacing">Digital (New Client) On-Boarding as an </text>
              <text x="713.39" y="63.38" font-size="37.5" font-weight="700" fill="#002B64" textLength="523.84" lengthAdjust="spacing">&#8216;Engagement Story-Board&#8217; -2</text>
            </g>

            <!-- His deck frame, returned in the firm's colour rather than #00B1E0.
                 Five bars inset from the edge with the foot broken in the lower left,
                 and the firm's mark standing in that break. -->
            <rect class="firm-bar is-t" x="8.13" y="8.13" width="1483.74" height="14.8" :fill="firmColour"></rect>
            <rect class="firm-bar is-l" x="8.13" y="22.92" width="14.16" height="798.16" :fill="firmColour"></rect>
            <rect class="firm-bar is-r" x="1477.71" y="22.92" width="14.16" height="798.16" :fill="firmColour"></rect>
            <rect class="firm-bar is-bl" x="8.13" y="821.07" width="95.01" height="14.8" :fill="firmColour"></rect>
            <rect class="firm-bar is-brun" x="248.31" y="821.07" width="1243.56" height="14.8" :fill="firmColour"></rect>
          </svg>
</template>

<script>
/**
 * ⚠ GENERATED — DO NOT EDIT THIS FILE.
 *
 * Lifted from design/mockups/strategy-concept-second-pages.html (drawing 5) by
 * `node scripts/build-concept-graphics.js`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: 'ConceptDigitalFunnelStoryboardSheet3',

  props: {
    /** The advisor firm's name, printed beside the mark. */
    firmName: {
      type: String,
      default: ''
    },

    /** One letter for the disc. */
    firmInitial: {
      type: String,
      default: ''
    },

    /** The firm's colour, as a CSS colour. Brands the page border and the disc. */
    firmColour: {
      type: String,
      default: '#0070c0'
    },

    /**
     * The firm's real logo, as an absolute http(s) URL.
     *
     * Mike's ruling, 2026-09-22: this IS the mark. The initials disc and the
     * printed name are the fallback shown only when a firm holds no logo. The
     * box is a fixed height with preserveAspectRatio="xMinYMid meet", so a logo
     * of any proportion is scaled to fit and never stretched or cropped.
     *
     * Supplied by `firmBrand()` in server/utils/firmsDirectory.js, which reads
     * it from Advisor-e's own firm profile record and returns null for anything
     * that is not an http(s) URL — so an empty string here is the safe state,
     * not a missing value.
     */
    firmLogo: {
      type: String,
      default: ''
    }
  }
}
</script>

<style scoped>
.scg {
  width: 100%;
}

.scg >>> svg {
  display: block;
  width: 100%;
  height: auto;
}
</style>
