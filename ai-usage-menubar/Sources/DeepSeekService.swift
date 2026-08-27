import Foundation
import Security

enum DeepSeekKeychain {
    private static let service = "local.vibecoding.tokenpulse.deepseek"
    private static let account = "api-key"

    static var hasKey: Bool { read() != nil }

    static func read() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func save(_ key: String) throws {
        delete()
        let attributes: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
            kSecValueData as String: Data(key.utf8),
        ]
        let status = SecItemAdd(attributes as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
        }
    }

    static func delete() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

struct DeepSeekBalanceSnapshot: Sendable {
    struct Balance: Sendable {
        let currency: String
        let total: Decimal
        let granted: Decimal
        let toppedUp: Decimal
    }

    let isAvailable: Bool
    let balances: [Balance]
}

enum DeepSeekServiceError: Error {
    case invalidResponse
    case unauthorized
    case requestFailed(Int)
}

enum DeepSeekService {
    private struct Response: Decodable {
        struct BalanceInfo: Decodable {
            let currency: String
            let totalBalance: String
            let grantedBalance: String
            let toppedUpBalance: String

            enum CodingKeys: String, CodingKey {
                case currency
                case totalBalance = "total_balance"
                case grantedBalance = "granted_balance"
                case toppedUpBalance = "topped_up_balance"
            }
        }

        let isAvailable: Bool
        let balanceInfos: [BalanceInfo]

        enum CodingKeys: String, CodingKey {
            case isAvailable = "is_available"
            case balanceInfos = "balance_infos"
        }
    }

    static func fetchBalance(apiKey: String) async throws -> DeepSeekBalanceSnapshot {
        var request = URLRequest(url: URL(string: "https://api.deepseek.com/user/balance")!)
        request.httpMethod = "GET"
        request.timeoutInterval = 15
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw DeepSeekServiceError.invalidResponse }
        if http.statusCode == 401 { throw DeepSeekServiceError.unauthorized }
        guard (200..<300).contains(http.statusCode) else {
            throw DeepSeekServiceError.requestFailed(http.statusCode)
        }

        let decoded = try JSONDecoder().decode(Response.self, from: data)
        let balances = decoded.balanceInfos.map {
            DeepSeekBalanceSnapshot.Balance(
                currency: $0.currency,
                total: Decimal(string: $0.totalBalance) ?? 0,
                granted: Decimal(string: $0.grantedBalance) ?? 0,
                toppedUp: Decimal(string: $0.toppedUpBalance) ?? 0
            )
        }
        return DeepSeekBalanceSnapshot(isAvailable: decoded.isAvailable, balances: balances)
    }
}
