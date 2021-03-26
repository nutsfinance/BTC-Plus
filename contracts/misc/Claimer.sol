// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

import "../interfaces/IGauge.sol";

/**
 * @dev A utility contract that helps to claims from multiple liquidity gauges.
 */
contract Claimer {

    using SafeMathUpgradeable for uint256;

    /**
     * @dev Claims AC reward from multiple gauges.
     */
    function claim(address[] memory _gauges) external {
        for (uint256 i = 0; i < _gauges.length; i++) {
            IGauge(_gauges[i]).claim(msg.sender, false);
        }
    }

    /**
     * @dev Returns the sum of claimable AC from multiple gauges.
     */
    function claimable(address _account, address[] memory _gauges) external view returns (uint256) {
        uint256 _total = 0;
        for (uint256 i = 0; i < _gauges.length; i++) {
            _total = _total.add(IGauge(_gauges[i]).claimable(_account));
        }

        return _total;
    }
}