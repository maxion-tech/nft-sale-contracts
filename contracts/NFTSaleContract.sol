// SPDX-License-Identifier: MIT
pragma solidity =0.8.7;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

/// @custom:security-contact dev@maxion.tech
contract NFTSaleContract is
    Pausable,
    AccessControl,
    ReentrancyGuard,
    ERC1155Holder
{
    using SafeERC20 for IERC20;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant PARAMETER_SETTER_ROLE =
        keccak256("PARAMETER_SETTER_ROLE");
    bytes32 public constant NFT_SELLER_ROLE = keccak256("NFT_SELLER_ROLE");
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE"); // for withdraw share amount to platform wallet
    bytes32 public constant PARTNER_ROLE = keccak256("PARTNER_ROLE"); // for withdraw share amount to partner wallet

    uint256 public constant DENOMINATOR = 10 ** 10;
    uint256 public constant MAX_SHARE_PERCENT = 100 * 10 ** 8;

    uint256 public platformSalesSharePercent;
    uint256 public partnerSalesSharePercent;

    uint256 public platformSalesShareAmountTotal;
    uint256 public partnerSalesShareAmountTotal;

    IERC1155 public nftContract;
    IERC20 public currencyContract;

    event SetSalesSharePercent(
        uint256 platformSalesSharePercent,
        uint256 partnerSalesSharePercent
    );

    event SetNftToSale(uint256 nftId, uint256 nftQuantity, uint256 nftPrice);
    event RemoveNftFromSale(uint256 nftId, uint256 nftQuantity);
    event SetNftPrice(uint256 nftId, uint256 nftPrice);
    event BuyNft(
        address buyer,
        uint256 nftId,
        uint256 nftQuantity,
        uint256 nftPrice,
        uint256 nftTotalPrice,
        uint256 platformShareAmount,
        uint256 partnerShareAmount
    );
    event WithdrawPlatformSalesShareAmount(
        address platformWallet,
        uint256 platformShareAmount
    );
    event WithdrawPartnerSalesShareAmount(
        address partnerWallet,
        uint256 partnerShareAmount
    );

    // map is store nft id and nft price
    mapping(uint256 => uint256) public nftPrice;

    // map is store nft sold quantity
    mapping(uint256 => uint256) public nftSoldQuantity;

    constructor(
        address admin,
        uint256 initPlatformSalesSharePercent,
        uint256 initPartnerSalesSharePercent,
        address nftContractAddress,
        address currencyContractAddress
    )
        isValidSalesSharePercent(
            initPlatformSalesSharePercent,
            initPartnerSalesSharePercent
        )
    {
        // require admin is not zero address
        require(admin != address(0), "NFTSaleContract: admin is zero address");

        // require admin is not deployer
        require(admin != msg.sender, "NFTSaleContract: admin is deployer");

        // require nft contract address is not zero address
        require(
            nftContractAddress != address(0),
            "NFTSaleContract: nft contract address is zero address"
        );

        // require nft contract is valid ERC1155 contract
        require(
            IERC1155(nftContractAddress).supportsInterface(
                type(IERC1155).interfaceId
            ),
            "NFTSaleContract: nft contract is not valid ERC1155 contract"
        );

        // require currency contract address is not zero address
        require(
            currencyContractAddress != address(0),
            "NFTSaleContract: currency contract address is zero address"
        );

        // set admin is DEFAULT_ADMIN_ROLE
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        // set playform and partner share percent
        platformSalesSharePercent = initPlatformSalesSharePercent;
        partnerSalesSharePercent = initPartnerSalesSharePercent;

        uint256 platformSalesSharePercentCalculated = (platformSalesSharePercent *
                100) / DENOMINATOR;
        uint256 partnerSalesSharePercentCalculated = (partnerSalesSharePercent *
            100) / DENOMINATOR;

        // set init share amount total
        platformSalesShareAmountTotal = 0;
        partnerSalesShareAmountTotal = 0;

        // emit SetSalesSharePercent event
        emit SetSalesSharePercent(
            platformSalesSharePercentCalculated,
            partnerSalesSharePercentCalculated
        );

        // set nft contract
        nftContract = IERC1155(nftContractAddress);

        // set currency contract
        currencyContract = IERC20(currencyContractAddress);
    }

    modifier isValidSalesSharePercent(
        uint256 inputPlatformSalesSharePercent,
        uint256 inputPartnerSalesSharePercent
    ) {
        // require platform and partner share percent is not zero
        require(
            inputPlatformSalesSharePercent != 0,
            "NFTSaleContract: platform share is zero"
        );
        require(
            inputPartnerSalesSharePercent != 0,
            "NFTSaleContract: partner share is zero"
        );

        // require platform and partner share percent is not greater than 100%
        require(
            inputPlatformSalesSharePercent <= MAX_SHARE_PERCENT,
            "NFTSaleContract: platform share is greater than 100%"
        );
        require(
            inputPartnerSalesSharePercent <= MAX_SHARE_PERCENT,
            "NFTSaleContract: partner share is greater than 100%"
        );

        // require platform and partner share percent is not greater than 100%
        require(
            inputPlatformSalesSharePercent + inputPartnerSalesSharePercent ==
                MAX_SHARE_PERCENT,
            "NFTSaleContract: platform and partner share is not equal to 100%"
        );
        _;
    }

    function calculateSalesShareAmount(
        uint256 amount
    )
        public
        view
        returns (uint256 platformShareAmount, uint256 partnerShareAmount)
    {
        // require amount is not zero
        require(amount != 0, "NFTSaleContract: amount is zero");

        // calculate platform and partner share amount
        platformShareAmount =
            (amount * platformSalesSharePercent) /
            DENOMINATOR;
        partnerShareAmount = amount - platformShareAmount;
    }

    function setSalesShareAmountPercent(
        uint256 newPlatformSalesSharePercent,
        uint256 newPartnerSalesSharePercent
    )
        external
        isValidSalesSharePercent(
            newPlatformSalesSharePercent,
            newPartnerSalesSharePercent
        )
        onlyRole(PARAMETER_SETTER_ROLE)
    {
        // set platform and partner share percent
        platformSalesSharePercent = newPlatformSalesSharePercent;
        partnerSalesSharePercent = newPartnerSalesSharePercent;

        uint256 platformSalesSharePercentCalculated = (platformSalesSharePercent *
                100) / DENOMINATOR;
        uint256 partnerSalesSharePercentCalculated = (partnerSalesSharePercent *
            100) / DENOMINATOR;

        // emit SetSalesSharePercent event
        emit SetSalesSharePercent(
            platformSalesSharePercentCalculated,
            partnerSalesSharePercentCalculated
        );
    }

    // function to transfer nft from seller wallet to this contract and set nft amout to sale and nft price
    function setNftToSale(
        uint256 nftId,
        uint256 nftQuantity,
        uint256 price
    ) external onlyRole(NFT_SELLER_ROLE) {
        // require nft quantity is not zero
        require(nftQuantity != 0, "NFTSaleContract: nft quantity is zero");

        // require nft price is not zero
        require(price != 0, "NFTSaleContract: nft price is zero");

        // require nft balance in seller wallet is greater or equal to nft quantity
        require(
            nftContract.balanceOf(msg.sender, nftId) >= nftQuantity,
            "NFTSaleContract: nft balance is less than nft quantity"
        );

        // require nft id is not zero
        require(nftId != 0, "NFTSaleContract: nft id is zero");

        // require nft id is not exist
        require(nftPrice[nftId] == 0, "NFTSaleContract: nft id is exist");

        emit SetNftToSale(nftId, nftQuantity, price);

        // set nft price
        nftPrice[nftId] = price;

        // transfer nft from seller wallet to this contract
        nftContract.safeTransferFrom(
            msg.sender,
            address(this),
            nftId,
            nftQuantity,
            ""
        );
    }

    // function to transfer all nft from this contract back to seller wallet and remove nft price
    function removeNftFromSale(
        uint256 nftId
    ) external onlyRole(NFT_SELLER_ROLE) {
        // require nft id is not zero
        require(nftId != 0, "NFTSaleContract: nft id is zero");

        // require nft id is exist
        require(nftPrice[nftId] != 0, "NFTSaleContract: nft id is not exist");

        // get nft amount in this contract
        uint256 nftAmount = nftContract.balanceOf(address(this), nftId);

        // require nft amount is not zero
        require(nftAmount != 0, "NFTSaleContract: nft amount is zero");

        emit RemoveNftFromSale(nftId, nftAmount);

        // remove nft price
        delete nftPrice[nftId];

        // transfer nft from this contract to seller wallet
        nftContract.safeTransferFrom(
            address(this),
            msg.sender,
            nftId,
            nftAmount,
            ""
        );
    }

    // function to set nft price
    function setNftPrice(
        uint256 nftId,
        uint256 price
    ) external onlyRole(NFT_SELLER_ROLE) {
        // require nft id is not zero
        require(nftId != 0, "NFTSaleContract: nft id is zero");

        // require nft id is exist
        require(nftPrice[nftId] != 0, "NFTSaleContract: nft id is not exist");

        // require nft price is not zero
        require(price != 0, "NFTSaleContract: nft price is zero");

        // set nft price
        nftPrice[nftId] = price;

        emit SetNftPrice(nftId, price);
    }

    // function to user can buy nft with currency token and transfer nft to user wallet and canculate sales share amount and increase sales share amount of platform and partner to withdraw later
    function buyNft(
        uint256 nftId,
        uint256 nftQuantity
    ) external whenNotPaused nonReentrant {
        // require nft quantity is not zero
        require(nftQuantity != 0, "NFTSaleContract: nft quantity is zero");

        // require nft id is not zero
        require(nftId != 0, "NFTSaleContract: nft id is zero");

        // require nft id is exist
        require(nftPrice[nftId] != 0, "NFTSaleContract: nft id is not exist");

        // require nft amount in this contract is greater or equal to nft quantity
        require(
            nftContract.balanceOf(address(this), nftId) >= nftQuantity,
            "NFTSaleContract: nft amount is less than nft quantity"
        );

        // get nft price
        uint256 nftPriceForSale = nftPrice[nftId];
        // calculate nft total price
        uint256 nftTotalPrice = nftPriceForSale * nftQuantity;

        // require user have enough currency token to buy nft
        require(
            currencyContract.balanceOf(msg.sender) >= nftTotalPrice,
            "NFTSaleContract: user have not enough currency token to buy nft"
        );

        // increase nft sold quantity
        nftSoldQuantity[nftId] += nftQuantity;

        uint256 initialBalance = currencyContract.balanceOf(address(this));

        // transfer currency token from user wallet to this contract
        currencyContract.safeTransferFrom(
            msg.sender,
            address(this),
            nftTotalPrice
        );

        uint256 finalBalance = currencyContract.balanceOf(address(this));
        uint256 actualReceivedAmount = finalBalance - initialBalance;

        // calculate sales share amount based on actual received amount
        (
            uint256 platformShareAmount,
            uint256 partnerShareAmount
        ) = calculateSalesShareAmount(actualReceivedAmount);

        emit BuyNft(
            msg.sender,
            nftId,
            nftQuantity,
            nftPriceForSale,
            nftTotalPrice,
            platformShareAmount,
            partnerShareAmount
        );

        // increase sales share amount of platform and partner to withdraw later
        platformSalesShareAmountTotal += platformShareAmount;
        partnerSalesShareAmountTotal += partnerShareAmount;

        // transfer nft from this contract to user wallet
        nftContract.safeTransferFrom(
            address(this),
            msg.sender,
            nftId,
            nftQuantity,
            ""
        );

        // if soldout then remove nft price
        if (
            nftContract.balanceOf(address(this), nftId) == 0 &&
            nftSoldQuantity[nftId] != 0
        ) {
            delete nftPrice[nftId];
        }
    }

    // function to platform can withdraw sales share amount and set sales share amount to zero
    function withdrawPlatformSalesShareAmount()
        external
        onlyRole(PLATFORM_ROLE)
        nonReentrant
    {
        // get platform sales share amount
        uint256 platformSalesShareAmount = platformSalesShareAmountTotal;

        // require platform sales share amount is not zero
        require(
            platformSalesShareAmount != 0,
            "NFTSaleContract: platform sales share amount is zero"
        );

        emit WithdrawPlatformSalesShareAmount(
            msg.sender,
            platformSalesShareAmount
        );

        // set platform sales share amount to zero
        platformSalesShareAmountTotal = 0;

        // transfer platform sales share amount from this contract to platform wallet
        currencyContract.safeTransfer(msg.sender, platformSalesShareAmount);
    }

    // function to partner can withdraw sales share amount and set sales share amount to zero
    function withdrawPartnerSalesShareAmount()
        external
        onlyRole(PARTNER_ROLE)
        nonReentrant
    {
        // get partner sales share amount
        uint256 partnerSalesShareAmount = partnerSalesShareAmountTotal;

        // require partner sales share amount is not zero
        require(
            partnerSalesShareAmount != 0,
            "NFTSaleContract: partner sales share amount is zero"
        );

        emit WithdrawPartnerSalesShareAmount(
            msg.sender,
            partnerSalesShareAmount
        );

        // set partner sales share amount to zero
        partnerSalesShareAmountTotal = 0;

        // transfer partner sales share amount from this contract to partner wallet
        currencyContract.safeTransfer(msg.sender, partnerSalesShareAmount);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // supports interfaces overdrive
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(AccessControl, ERC1155Receiver)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
