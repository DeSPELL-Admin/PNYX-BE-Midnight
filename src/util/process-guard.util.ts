import { Logger } from '@nestjs/common';

/**
 * 잡히지 않은 프로미스 rejection으로 프로세스가 죽는 것을 막는 전역 안전망.
 *
 * ethers v6 등 일부 라이브러리는 정리 과정에서 .catch가 없는 fire-and-forget
 * 프로미스를 reject한다(예: provider.destroy() 시 취소되는 eth_unsubscribe).
 * Node는 기본적으로 unhandledRejection 발생 시 프로세스를 종료하므로,
 * 스캐너 가용성을 위해 로그만 남기고 프로세스는 살려둔다.
 */
export function registerGlobalErrorGuards(
    logger: Logger = new Logger('Process'),
): void {
    process.on('unhandledRejection', (reason: unknown) => {
        logger.error(
            'Unhandled promise rejection (logged; process kept alive)',
            reason instanceof Error ? reason.stack : reason,
        );
    });
}
